# WebGPU SHA-512

Implementation of SHA-512 algorithm using WGSL compute shader, optimized for speed.

💻 See the demo <a href="https://dcfgvy.github.io/SHA512-WebGPU/">here</a> (your browser should support WebGPU)! The shader code itself is available at <a href="https://github.com/Dcfgvy/SHA512-WebGPU/blob/main/src/sha512.wgsl">src/sha512.wgsl</a>.

## Important:

 - The `input` buffer accepts an array of unsigned 32-bit integers. Each integer should be treated as 4 bytes in **big-endian** byte order. See the `stringToU32Array` method in <a href="https://github.com/Dcfgvy/SHA512-WebGPU/blob/main/src/main.ts">src/main.ts</a> for JS implementation details.
 
 - The `input_size` buffer accepts an array with a single unsigned 32-bit integer, which indicates the size of `input` **in bits, not in bytes**.
 
 - This algorithm can process an input up to 536 MB in size, which should be sufficient for most use cases. The limit is caused by the size limits of an unsigned 32-bit integer `input_size[0]`. To be precise the max size is 4294966144 bits (2^32 - 1 *(padding bit)* - 128 *(length bits)* - 1023 *(needed for ceil division)*).
 
 - The `result` buffer is an array of 16 unsigned 32-bit integers, representing the hash in **big-endian** byte order as well. See the `computeHash` method in <a href="https://github.com/Dcfgvy/SHA512-WebGPU/blob/main/src/main.ts">src/main.ts</a> for JS implementation details.

### ⭐ If you found this project helpful, please consider giving it a star!
