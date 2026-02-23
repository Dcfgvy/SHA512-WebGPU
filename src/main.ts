import shader from "./sha512.wgsl?raw";
import { sha512 as sha512js } from "js-sha512";

class SHA512WebGPU {
  private device: GPUDevice | null = null;
  private shaderCode: string = "";

  async init() {
    if (!navigator.gpu) {
      alert("WebGPU not supported in this environment");
      throw new Error("WebGPU not supported in this environment");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      alert("No appropriate GPUAdapter found");
      throw new Error("No appropriate GPUAdapter found");
    }

    this.device = await adapter.requestDevice();

    try {
      this.shaderCode = shader;
    } catch (error) {
      throw new Error(
        "Could not read sha512.wgsl file. Make sure it exists in the current directory."
      );
    }
  }

  private stringToU32Array(input: string): Uint32Array {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);

    // Pad to 4-byte boundary
    const paddedLength = Math.ceil(bytes.length / 4) * 4;
    const paddedBytes = new Uint8Array(paddedLength);
    paddedBytes.set(bytes);

    // Convert to u32 array with big-endian byte order
    const u32Array = new Uint32Array(paddedLength / 4);
    for (let i = 0; i < u32Array.length; i++) {
      const byteOffset = i * 4;
      // Pack 4 bytes into u32 in big-endian order
      u32Array[i] =
        (paddedBytes[byteOffset] << 24) |
        (paddedBytes[byteOffset + 1] << 16) |
        (paddedBytes[byteOffset + 2] << 8) |
        paddedBytes[byteOffset + 3];
    }

    return u32Array;
  }

  async computeHash(input: string): Promise<string> {
    if (!this.device) {
      throw new Error("Device not initialized. Call init() first.");
    }

    // Convert input to u32 array
    const inputU32 = this.stringToU32Array(input);
    const inputSizeInBytes = new TextEncoder().encode(input).length;

    // Create shader module
    const shaderModule = this.device.createShaderModule({
      code: this.shaderCode,
    });

    // Create buffers
    const inputBuffer = this.device.createBuffer({
      size: Math.max(inputU32.byteLength, 16), // Minimum 16 bytes
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const inputSizeBuffer = this.device.createBuffer({
      size: 4, // Single u32
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const resultBuffer = this.device.createBuffer({
      size: 64 * 4, // 64 u32 values = 256 bytes
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const readBuffer = this.device.createBuffer({
      size: 64 * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    // Write data to buffers
    this.device.queue.writeBuffer(inputBuffer, 0, new Uint32Array(inputU32));
    this.device.queue.writeBuffer(
      inputSizeBuffer,
      0,
      new Uint32Array([inputSizeInBytes * 8])
    );

    // Create bind group layout
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: inputSizeBuffer } },
        { binding: 2, resource: { buffer: resultBuffer } },
      ],
    });

    // Create compute pipeline
    const computePipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: {
        module: shaderModule,
        entryPoint: "main",
      },
    });

    // Create command encoder and dispatch
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(1);
    passEncoder.end();

    // Copy result to read buffer
    commandEncoder.copyBufferToBuffer(resultBuffer, 0, readBuffer, 0, 64 * 4);

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);

    // Read results
    await readBuffer.mapAsync(GPUMapMode.READ);
    const resultArrayBuffer = readBuffer.getMappedRange();
    const resultArray = new Uint32Array(resultArrayBuffer.slice(0));
    readBuffer.unmap();

    // Convert result to hex string (SHA-512 is 64 bytes = 512 bits)
    const hashBytes = new Uint8Array(64);
    for (let i = 0; i < 16; i++) {
      const u32Value = resultArray[i];
      // Extract 4 bytes from each u32 in big-endian order
      hashBytes[i * 4 + 0] = (u32Value >>> 24) & 0xff; // Most significant byte
      hashBytes[i * 4 + 1] = (u32Value >>> 16) & 0xff;
      hashBytes[i * 4 + 2] = (u32Value >>> 8) & 0xff;
      hashBytes[i * 4 + 3] = u32Value & 0xff; // Least significant byte
    }

    return Array.from(hashBytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // Generate random test data
  generateRandomString(length: number): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Verify against js-sha512
  verifyWithJsCrypto(input: string, ourResult: string): boolean {
    const hash = sha512js.create().update(input).hex();
    return hash === ourResult;
  }
}

// Main execution
async function main() {
  try {
    console.log("🚀 Starting SHA-512 WebGPU Test");
    console.log("================================");

    const sha512 = new SHA512WebGPU();
    await sha512.init();

    // Test cases
    const testCases = [
      "Hello, World!",
      "The quick brown fox jumps over the lazy dog",
      sha512.generateRandomString(50),
      sha512.generateRandomString(100),
      "", // Empty string
      "!", // Single character
      "SHA-512 test with WebGPU implementation using WGSL shaders!",
    ];

    console.log("Running test cases...\n");

    for (let i = 0; i < testCases.length; i++) {
      const input = testCases[i];
      const displayInput =
        input.length > 50 ? input.substring(0, 47) + "..." : input;

      console.log(`Test ${i + 1}: "${displayInput}"`);
      console.log(`Input length: ${input.length} characters`);

      try {
        const startTime = performance.now();
        const result = await sha512.computeHash(input);
        const endTime = performance.now();

        console.log(`WebGPU Result: ${result}`);

        // Verify js-sha512
        const isValid = sha512.verifyWithJsCrypto(input, result);
        const jsResult = sha512js.create().update(input).hex();
        console.log(`JS Result: ${jsResult}`);
        console.log(`✅ Verification: ${isValid ? "PASSED" : "FAILED"}`);
        console.log(
          `⏱️  Computation time (most of it is JS pre- and post-computations): ${(endTime - startTime).toFixed(2)}ms`
        );

        if (!isValid) {
          console.log("❌ Hash mismatch detected!");
        }
      } catch (error) {
        console.log(`❌ Error: ${error}`);
      }

      console.log("─".repeat(80));
    }

    // Performance test with larger data
    console.log("\n🏃 Performance Test with Random Large Data");
    console.log("====================================");

    const largeInput = sha512.generateRandomString(10000);
    console.log(`Testing with ${largeInput.length} character string:`);
    console.log(largeInput);

    const startTime = performance.now();
    const largeResult = await sha512.computeHash(largeInput);
    const endTime = performance.now();

    console.log(`Result: ${largeResult}`);
    console.log(
      `⏱️  Large data computation time (most of it is JS pre- and post-computations): ${(endTime - startTime).toFixed(2)}ms`
    );

    const isLargeValid = sha512.verifyWithJsCrypto(largeInput, largeResult);

    const jsResult = sha512js.create().update(largeInput).hex();
    console.log(`JS Result: ${jsResult}`);
    console.log(
      `✅ Large data verification: ${isLargeValid ? "PASSED" : "FAILED"}`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch(console.error);
