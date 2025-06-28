// SHA-512 WebGPU Implementation based on FIPS PUB 180-4 available at https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
// Copyright (c) 2025 Ivan Kusliy <ipkusliywork@gmail.com>
// Licensed under the MIT License

// Supports input up to 536 MB in size (2^32 - 1 - 128 - 1023 bits) in big-endian byte order

@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read> input_size: array<u32, 1>;  // IN BITS !!!
@group(0) @binding(2) var<storage, read_write> result: array<u32, 16>;

struct u64_pair {
  high: u32,
  low: u32,
}

const SHA512_MESSAGE_SCHEDULE_SIZE = 80u;

// FIPS PUB 180-4 Section 4.2.3
const K: array<u64_pair, 80> = array<u64_pair, 80>(
  u64_pair(0x428a2f98u, 0xd728ae22u), u64_pair(0x71374491u, 0x23ef65cdu), u64_pair(0xb5c0fbcfu, 0xec4d3b2fu), u64_pair(0xe9b5dba5u, 0x8189dbbcu),
  u64_pair(0x3956c25bu, 0xf348b538u), u64_pair(0x59f111f1u, 0xb605d019u), u64_pair(0x923f82a4u, 0xaf194f9bu), u64_pair(0xab1c5ed5u, 0xda6d8118u),
  u64_pair(0xd807aa98u, 0xa3030242u), u64_pair(0x12835b01u, 0x45706fbeu), u64_pair(0x243185beu, 0x4ee4b28cu), u64_pair(0x550c7dc3u, 0xd5ffb4e2u),
  u64_pair(0x72be5d74u, 0xf27b896fu), u64_pair(0x80deb1feu, 0x3b1696b1u), u64_pair(0x9bdc06a7u, 0x25c71235u), u64_pair(0xc19bf174u, 0xcf692694u),
  u64_pair(0xe49b69c1u, 0x9ef14ad2u), u64_pair(0xefbe4786u, 0x384f25e3u), u64_pair(0x0fc19dc6u, 0x8b8cd5b5u), u64_pair(0x240ca1ccu, 0x77ac9c65u),
  u64_pair(0x2de92c6fu, 0x592b0275u), u64_pair(0x4a7484aau, 0x6ea6e483u), u64_pair(0x5cb0a9dcu, 0xbd41fbd4u), u64_pair(0x76f988dau, 0x831153b5u),
  u64_pair(0x983e5152u, 0xee66dfabu), u64_pair(0xa831c66du, 0x2db43210u), u64_pair(0xb00327c8u, 0x98fb213fu), u64_pair(0xbf597fc7u, 0xbeef0ee4u),
  u64_pair(0xc6e00bf3u, 0x3da88fc2u), u64_pair(0xd5a79147u, 0x930aa725u), u64_pair(0x06ca6351u, 0xe003826fu), u64_pair(0x14292967u, 0x0a0e6e70u),
  u64_pair(0x27b70a85u, 0x46d22ffcu), u64_pair(0x2e1b2138u, 0x5c26c926u), u64_pair(0x4d2c6dfcu, 0x5ac42aedu), u64_pair(0x53380d13u, 0x9d95b3dfu),
  u64_pair(0x650a7354u, 0x8baf63deu), u64_pair(0x766a0abbu, 0x3c77b2a8u), u64_pair(0x81c2c92eu, 0x47edaee6u), u64_pair(0x92722c85u, 0x1482353bu),
  u64_pair(0xa2bfe8a1u, 0x4cf10364u), u64_pair(0xa81a664bu, 0xbc423001u), u64_pair(0xc24b8b70u, 0xd0f89791u), u64_pair(0xc76c51a3u, 0x0654be30u),
  u64_pair(0xd192e819u, 0xd6ef5218u), u64_pair(0xd6990624u, 0x5565a910u), u64_pair(0xf40e3585u, 0x5771202au), u64_pair(0x106aa070u, 0x32bbd1b8u),
  u64_pair(0x19a4c116u, 0xb8d2d0c8u), u64_pair(0x1e376c08u, 0x5141ab53u), u64_pair(0x2748774cu, 0xdf8eeb99u), u64_pair(0x34b0bcb5u, 0xe19b48a8u),
  u64_pair(0x391c0cb3u, 0xc5c95a63u), u64_pair(0x4ed8aa4au, 0xe3418acbu), u64_pair(0x5b9cca4fu, 0x7763e373u), u64_pair(0x682e6ff3u, 0xd6b2b8a3u),
  u64_pair(0x748f82eeu, 0x5defb2fcu), u64_pair(0x78a5636fu, 0x43172f60u), u64_pair(0x84c87814u, 0xa1f0ab72u), u64_pair(0x8cc70208u, 0x1a6439ecu),
  u64_pair(0x90befffau, 0x23631e28u), u64_pair(0xa4506cebu, 0xde82bde9u), u64_pair(0xbef9a3f7u, 0xb2c67915u), u64_pair(0xc67178f2u, 0xe372532bu),
  u64_pair(0xca273eceu, 0xea26619cu), u64_pair(0xd186b8c7u, 0x21c0c207u), u64_pair(0xeada7dd6u, 0xcde0eb1eu), u64_pair(0xf57d4f7fu, 0xee6ed178u),
  u64_pair(0x06f067aau, 0x72176fbau), u64_pair(0x0a637dc5u, 0xa2c898a6u), u64_pair(0x113f9804u, 0xbef90daeu), u64_pair(0x1b710b35u, 0x131c471bu),
  u64_pair(0x28db77f5u, 0x23047d84u), u64_pair(0x32caab7bu, 0x40c72493u), u64_pair(0x3c9ebe0au, 0x15c9bebcu), u64_pair(0x431d67c4u, 0x9c100d4cu),
  u64_pair(0x4cc5d4beu, 0xcb3e42b6u), u64_pair(0x597f299cu, 0xfc657e2au), u64_pair(0x5fcb6fabu, 0x3ad6faecu), u64_pair(0x6c44198cu, 0x4a475817u),
);


// ---------------------------------------- BASIC OPERATIONS START ----------------------------------------


fn NOT(a: u64_pair) -> u64_pair { return u64_pair(~(a.high), ~(a.low)); }
fn AND(a: u64_pair, b: u64_pair) -> u64_pair { return u64_pair(a.high & b.high, a.low & b.low); }
fn XOR(a: u64_pair, b: u64_pair) -> u64_pair { return u64_pair(a.high ^ b.high, a.low ^ b.low); }

// Rotate Right & Rotate Left
// Assuming we're rotating by 0 < bits < 32 in both functions.
fn ROTR(x: u64_pair, shift: u32) -> u64_pair {
  let new_low = (x.low >> shift) | (x.high << (32u - shift));
  let new_high = (x.high >> shift) | (x.low << (32u - shift));
  return u64_pair(new_high, new_low);
}
fn ROTL(x: u64_pair, shift: u32) -> u64_pair {
  let new_low = (x.low << shift) | (x.high >> (32u - shift));
  let new_high = (x.high << shift) | (x.low >> (32u - shift));
  return u64_pair(new_high, new_low);
}

// Shift right
fn SHR(x: u64_pair, shift: u32) -> u64_pair {
  // Assuming shift is less than 32 and not 0
  let new_low = (x.low >> shift) | (x.high << (32u - shift));
  let new_high = x.high >> shift;
  return u64_pair(new_high, new_low);
}

// FIPS PUB 180-4 Section 4.8 – Choose
fn ch(x: u64_pair, y: u64_pair, z: u64_pair) -> u64_pair { return XOR(AND(x, y), AND(NOT(x), z)); }

// FIPS PUB 180-4 Section 4.9 – Majority
fn maj(x: u64_pair, y: u64_pair, z: u64_pair) -> u64_pair { return XOR( XOR(AND(x, y), AND(x, z)) , AND(y, z) ); }

// FIPS PUB 180-4 Section 4.10
fn Sigma_0(x: u64_pair) -> u64_pair { return XOR( XOR(ROTR(x, 28u), ROTL(x, 30u)) , ROTL(x, 25u) ); }

// FIPS PUB 180-4 Section 4.11
fn Sigma_1(x: u64_pair) -> u64_pair { return XOR( XOR(ROTR(x, 14u), ROTR(x, 18u)) , ROTL(x, 23u) ); }

// FIPS PUB 180-4 Section 4.12
fn sigma_0(x: u64_pair) -> u64_pair { return XOR( XOR(ROTR(x, 1u), ROTR(x, 8u)) , SHR(x, 7u) ); }

// FIPS PUB 180-4 Section 4.13
fn sigma_1(x: u64_pair) -> u64_pair { return XOR( XOR(ROTR(x, 19u), ROTL(x, 3u)) , SHR(x, 6u) ); }

// Addition modulo 2^64
fn add_64(a: u64_pair, b: u64_pair) -> u64_pair {
  let low_sum: u32 = a.low + b.low;
  let carry = u32(low_sum < a.low);
  let high_sum: u32 = a.high + b.high + carry;
  return u64_pair(high_sum, low_sum);
}


// ---------------------------------------- BASIC OPERATIONS END ----------------------------------------


fn process_u32_chunk(bit_start: u32, size_bits: u32, input_array_length: u32) -> u32 {
  if(bit_start >= size_bits){
    // Pure padding area - check if padding bit goes here
    return select(0u, 0x80000000u >> (size_bits - bit_start), size_bits == bit_start);
  }

  let u32_idx = bit_start / 32u;
  if(u32_idx >= input_array_length) { return 0u; }
  
  let bit_end = bit_start + 32u;
  if(bit_end <= size_bits){
    // Full message data
    return input[u32_idx];
  }
  else{
    // Partial message data + padding bit
    let valid_bits = size_bits - bit_start;
    let mask = 0xFFFFFFFFu << (32u - valid_bits);
    return (input[u32_idx] & mask) | (0x80000000u >> valid_bits);
  }
}

fn get_message_block(size_bits: u32, k: u32, n: u32, input_array_length: u32) -> array<u64_pair, SHA512_MESSAGE_SCHEDULE_SIZE> {
  var block: array<u64_pair, SHA512_MESSAGE_SCHEDULE_SIZE>;
  
  let block_start_bit = k * 1024u;
  let is_final_block = (k == n - 1u);

  for(var i = 0u; i < 16u; i++){
    var high: u32;
    var low: u32;
    
    if (is_final_block && i >= 14u) {
      // Length field in final block
      high = 0u;  // high 64 bits of length (always 0)
      low = select(size_bits, 0u, i == 14u);  // low 64 bits of length
    } else {
      // Message data and padding
      let u64_bit_start = block_start_bit + i * 64u;
      high = process_u32_chunk(u64_bit_start, size_bits, input_array_length);
      low = process_u32_chunk(u64_bit_start + 32u, size_bits, input_array_length);
    }
    
    block[i] = u64_pair(high, low);
  }
  
  return block;
}

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let input_size_bits: u32 = input_size[0];
  let input_array_length: u32 = (input_size_bits + 31u) / 32u;
  // Ceil division: (total bits with 128 length bits and 1 padding bit + 1024 - 1) divided by 1024
  let n: u32 = (input_size_bits + 1152u) / 1024u;

  // FIPS PUB 180-4 Section 5.3.5
  var a: u64_pair = u64_pair(0x6a09e667u, 0xf3bcc908u);
  var b: u64_pair = u64_pair(0xbb67ae85u, 0x84caa73bu);
  var c: u64_pair = u64_pair(0x3c6ef372u, 0xfe94f82bu);
  var d: u64_pair = u64_pair(0xa54ff53au, 0x5f1d36f1u);
  var e: u64_pair = u64_pair(0x510e527fu, 0xade682d1u);
  var f: u64_pair = u64_pair(0x9b05688cu, 0x2b3e6c1fu);
  var g: u64_pair = u64_pair(0x1f83d9abu, 0xfb41bd6bu);
  var h: u64_pair = u64_pair(0x5be0cd19u, 0x137e2179u);

  var a_previous: u64_pair = a;
  var b_previous: u64_pair = b;
  var c_previous: u64_pair = c;
  var d_previous: u64_pair = d;
  var e_previous: u64_pair = e;
  var f_previous: u64_pair = f;
  var g_previous: u64_pair = g;
  var h_previous: u64_pair = h;

  // FIPS PUB 180-4 Section 6.4.2
  for(var i: u32 = 0u; i < n; i++){
    // message_schedule will only contain the first 16 messages - the 1024-bit block M(i)
    var message_schedule: array<u64_pair, SHA512_MESSAGE_SCHEDULE_SIZE> = get_message_block(input_size_bits, i, n, input_array_length);

    // Calculate the rest 64 messages
    for(var t: u32 = 16u; t < SHA512_MESSAGE_SCHEDULE_SIZE; t++){
      message_schedule[t] = add_64(
                              add_64(
                                add_64(
                                  sigma_1(message_schedule[t - 2]),
                                  message_schedule[t - 7]
                                ),
                                sigma_0(message_schedule[t - 15])
                              ),
                              message_schedule[t - 16]
                            );
    }

    // Update the hash values
    for(var t: u32 = 0u; t < SHA512_MESSAGE_SCHEDULE_SIZE; t++){
      let T1: u64_pair =  add_64(
                            add_64(
                              add_64(
                                add_64(
                                  h,
                                  Sigma_1(e)
                                ),
                                ch(e, f, g)
                              ),
                              K[t]
                            ),
                            message_schedule[t]
                          );
      let T2: u64_pair =  add_64(
                            Sigma_0(a),
                            maj(a, b, c)
                          );
      h = g;
      g = f;
      f = e;
      e = add_64(d, T1);
      d = c;
      c = b;
      b = a;
      a = add_64(T1, T2);
    }

    // Compute intermediate hash
    a = add_64(a, a_previous);
    b = add_64(b, b_previous);
    c = add_64(c, c_previous);
    d = add_64(d, d_previous);
    e = add_64(e, e_previous);
    f = add_64(f, f_previous);
    g = add_64(g, g_previous);
    h = add_64(h, h_previous);
    a_previous = a;
    b_previous = b;
    c_previous = c;
    d_previous = d;
    e_previous = e;
    f_previous = f;
    g_previous = g;
    h_previous = h;
  }

  // Return the final 512-bit message digest
  result = array<u32, 16>(
    a.high, a.low, b.high, b.low,
    c.high, c.low, d.high, d.low,
    e.high, e.low, f.high, f.low,
    g.high, g.low, h.high, h.low,
  );
}
