var O0=Object.defineProperty;var T0=(y,b,C)=>b in y?O0(y,b,{enumerable:!0,configurable:!0,writable:!0,value:C}):y[b]=C;var w0=(y,b,C)=>T0(y,typeof b!="symbol"?b+"":b,C);(function(){const b=document.createElement("link").relList;if(b&&b.supports&&b.supports("modulepreload"))return;for(const f of document.querySelectorAll('link[rel="modulepreload"]'))R(f);new MutationObserver(f=>{for(const E of f)if(E.type==="childList")for(const i0 of E.addedNodes)i0.tagName==="LINK"&&i0.rel==="modulepreload"&&R(i0)}).observe(document,{childList:!0,subtree:!0});function C(f){const E={};return f.integrity&&(E.integrity=f.integrity),f.referrerPolicy&&(E.referrerPolicy=f.referrerPolicy),f.crossOrigin==="use-credentials"?E.credentials="include":f.crossOrigin==="anonymous"?E.credentials="omit":E.credentials="same-origin",E}function R(f){if(f.ep)return;f.ep=!0;const E=C(f);fetch(f.href,E)}})();const I0=`// SHA-512 WebGPU Implementation based on FIPS PUB 180-4 available at https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf\r
// Copyright (c) 2025 Ivan Kusliy <ipkusliywork@gmail.com>\r
// Licensed under the MIT License\r
\r
// Supports input up to 536 MB in size (2^32 - 1 - 128 - 1023 bits) in big-endian byte order\r
\r
@group(0) @binding(0) var<storage, read> input: array<u32>;\r
@group(0) @binding(1) var<storage, read> input_size: array<u32, 1>;  // IN BITS !!!\r
@group(0) @binding(2) var<storage, read_write> result: array<u32, 16>;\r
\r
struct u64_pair {\r
  high: u32,\r
  low: u32,\r
}\r
\r
const SHA512_MESSAGE_SCHEDULE_SIZE = 80u;\r
\r
// FIPS PUB 180-4 Section 4.2.3\r
const K: array<u64_pair, 80> = array<u64_pair, 80>(\r
  u64_pair(0x428a2f98u, 0xd728ae22u), u64_pair(0x71374491u, 0x23ef65cdu), u64_pair(0xb5c0fbcfu, 0xec4d3b2fu), u64_pair(0xe9b5dba5u, 0x8189dbbcu),\r
  u64_pair(0x3956c25bu, 0xf348b538u), u64_pair(0x59f111f1u, 0xb605d019u), u64_pair(0x923f82a4u, 0xaf194f9bu), u64_pair(0xab1c5ed5u, 0xda6d8118u),\r
  u64_pair(0xd807aa98u, 0xa3030242u), u64_pair(0x12835b01u, 0x45706fbeu), u64_pair(0x243185beu, 0x4ee4b28cu), u64_pair(0x550c7dc3u, 0xd5ffb4e2u),\r
  u64_pair(0x72be5d74u, 0xf27b896fu), u64_pair(0x80deb1feu, 0x3b1696b1u), u64_pair(0x9bdc06a7u, 0x25c71235u), u64_pair(0xc19bf174u, 0xcf692694u),\r
  u64_pair(0xe49b69c1u, 0x9ef14ad2u), u64_pair(0xefbe4786u, 0x384f25e3u), u64_pair(0x0fc19dc6u, 0x8b8cd5b5u), u64_pair(0x240ca1ccu, 0x77ac9c65u),\r
  u64_pair(0x2de92c6fu, 0x592b0275u), u64_pair(0x4a7484aau, 0x6ea6e483u), u64_pair(0x5cb0a9dcu, 0xbd41fbd4u), u64_pair(0x76f988dau, 0x831153b5u),\r
  u64_pair(0x983e5152u, 0xee66dfabu), u64_pair(0xa831c66du, 0x2db43210u), u64_pair(0xb00327c8u, 0x98fb213fu), u64_pair(0xbf597fc7u, 0xbeef0ee4u),\r
  u64_pair(0xc6e00bf3u, 0x3da88fc2u), u64_pair(0xd5a79147u, 0x930aa725u), u64_pair(0x06ca6351u, 0xe003826fu), u64_pair(0x14292967u, 0x0a0e6e70u),\r
  u64_pair(0x27b70a85u, 0x46d22ffcu), u64_pair(0x2e1b2138u, 0x5c26c926u), u64_pair(0x4d2c6dfcu, 0x5ac42aedu), u64_pair(0x53380d13u, 0x9d95b3dfu),\r
  u64_pair(0x650a7354u, 0x8baf63deu), u64_pair(0x766a0abbu, 0x3c77b2a8u), u64_pair(0x81c2c92eu, 0x47edaee6u), u64_pair(0x92722c85u, 0x1482353bu),\r
  u64_pair(0xa2bfe8a1u, 0x4cf10364u), u64_pair(0xa81a664bu, 0xbc423001u), u64_pair(0xc24b8b70u, 0xd0f89791u), u64_pair(0xc76c51a3u, 0x0654be30u),\r
  u64_pair(0xd192e819u, 0xd6ef5218u), u64_pair(0xd6990624u, 0x5565a910u), u64_pair(0xf40e3585u, 0x5771202au), u64_pair(0x106aa070u, 0x32bbd1b8u),\r
  u64_pair(0x19a4c116u, 0xb8d2d0c8u), u64_pair(0x1e376c08u, 0x5141ab53u), u64_pair(0x2748774cu, 0xdf8eeb99u), u64_pair(0x34b0bcb5u, 0xe19b48a8u),\r
  u64_pair(0x391c0cb3u, 0xc5c95a63u), u64_pair(0x4ed8aa4au, 0xe3418acbu), u64_pair(0x5b9cca4fu, 0x7763e373u), u64_pair(0x682e6ff3u, 0xd6b2b8a3u),\r
  u64_pair(0x748f82eeu, 0x5defb2fcu), u64_pair(0x78a5636fu, 0x43172f60u), u64_pair(0x84c87814u, 0xa1f0ab72u), u64_pair(0x8cc70208u, 0x1a6439ecu),\r
  u64_pair(0x90befffau, 0x23631e28u), u64_pair(0xa4506cebu, 0xde82bde9u), u64_pair(0xbef9a3f7u, 0xb2c67915u), u64_pair(0xc67178f2u, 0xe372532bu),\r
  u64_pair(0xca273eceu, 0xea26619cu), u64_pair(0xd186b8c7u, 0x21c0c207u), u64_pair(0xeada7dd6u, 0xcde0eb1eu), u64_pair(0xf57d4f7fu, 0xee6ed178u),\r
  u64_pair(0x06f067aau, 0x72176fbau), u64_pair(0x0a637dc5u, 0xa2c898a6u), u64_pair(0x113f9804u, 0xbef90daeu), u64_pair(0x1b710b35u, 0x131c471bu),\r
  u64_pair(0x28db77f5u, 0x23047d84u), u64_pair(0x32caab7bu, 0x40c72493u), u64_pair(0x3c9ebe0au, 0x15c9bebcu), u64_pair(0x431d67c4u, 0x9c100d4cu),\r
  u64_pair(0x4cc5d4beu, 0xcb3e42b6u), u64_pair(0x597f299cu, 0xfc657e2au), u64_pair(0x5fcb6fabu, 0x3ad6faecu), u64_pair(0x6c44198cu, 0x4a475817u),\r
);\r
\r
\r
// ---------------------------------------- BASIC OPERATIONS START ----------------------------------------\r
\r
\r
fn NOT(a: u64_pair) -> u64_pair { return u64_pair(~(a.high), ~(a.low)); }\r
fn AND(a: u64_pair, b: u64_pair) -> u64_pair { return u64_pair(a.high & b.high, a.low & b.low); }\r
fn XOR(a: u64_pair, b: u64_pair) -> u64_pair { return u64_pair(a.high ^ b.high, a.low ^ b.low); }\r
\r
// Rotate Right & Rotate Left\r
// Assuming we're rotating by 0 < bits < 32 in both functions.\r
fn ROTR(x: u64_pair, shift: u32) -> u64_pair {\r
  let new_low = (x.low >> shift) | (x.high << (32u - shift));\r
  let new_high = (x.high >> shift) | (x.low << (32u - shift));\r
  return u64_pair(new_high, new_low);\r
}\r
fn ROTL(x: u64_pair, shift: u32) -> u64_pair {\r
  let new_low = (x.low << shift) | (x.high >> (32u - shift));\r
  let new_high = (x.high << shift) | (x.low >> (32u - shift));\r
  return u64_pair(new_high, new_low);\r
}\r
\r
// Shift right\r
fn SHR(x: u64_pair, shift: u32) -> u64_pair {\r
  // Assuming shift is less than 32 and not 0\r
  let new_low = (x.low >> shift) | (x.high << (32u - shift));\r
  let new_high = x.high >> shift;\r
  return u64_pair(new_high, new_low);\r
}\r
\r
// FIPS PUB 180-4 Section 4.8 – Choose\r
fn ch(x: u64_pair, y: u64_pair, z: u64_pair) -> u64_pair { return XOR(AND(x, y), AND(NOT(x), z)); }\r
\r
// FIPS PUB 180-4 Section 4.9 – Majority\r
fn maj(x: u64_pair, y: u64_pair, z: u64_pair) -> u64_pair { return XOR( XOR(AND(x, y), AND(x, z)) , AND(y, z) ); }\r
\r
// FIPS PUB 180-4 Section 4.10\r
fn Sigma_0(x: u64_pair) -> u64_pair { return XOR( XOR(ROTR(x, 28u), ROTL(x, 30u)) , ROTL(x, 25u) ); }\r
\r
// FIPS PUB 180-4 Section 4.11\r
fn Sigma_1(x: u64_pair) -> u64_pair { return XOR( XOR(ROTR(x, 14u), ROTR(x, 18u)) , ROTL(x, 23u) ); }\r
\r
// FIPS PUB 180-4 Section 4.12\r
fn sigma_0(x: u64_pair) -> u64_pair { return XOR( XOR(ROTR(x, 1u), ROTR(x, 8u)) , SHR(x, 7u) ); }\r
\r
// FIPS PUB 180-4 Section 4.13\r
fn sigma_1(x: u64_pair) -> u64_pair { return XOR( XOR(ROTR(x, 19u), ROTL(x, 3u)) , SHR(x, 6u) ); }\r
\r
// Addition modulo 2^64\r
fn add_64(a: u64_pair, b: u64_pair) -> u64_pair {\r
  let low_sum: u32 = a.low + b.low;\r
  let carry = u32(low_sum < a.low);\r
  let high_sum: u32 = a.high + b.high + carry;\r
  return u64_pair(high_sum, low_sum);\r
}\r
\r
\r
// ---------------------------------------- BASIC OPERATIONS END ----------------------------------------\r
\r
\r
fn process_u32_chunk(bit_start: u32, size_bits: u32, input_array_length: u32) -> u32 {\r
  if(bit_start >= size_bits){\r
    // Pure padding area - check if padding bit goes here\r
    return select(0u, 0x80000000u >> (size_bits - bit_start), size_bits == bit_start);\r
  }\r
\r
  let u32_idx = bit_start / 32u;\r
  if(u32_idx >= input_array_length) { return 0u; }\r
  \r
  let bit_end = bit_start + 32u;\r
  if(bit_end <= size_bits){\r
    // Full message data\r
    return input[u32_idx];\r
  }\r
  else{\r
    // Partial message data + padding bit\r
    let valid_bits = size_bits - bit_start;\r
    let mask = 0xFFFFFFFFu << (32u - valid_bits);\r
    return (input[u32_idx] & mask) | (0x80000000u >> valid_bits);\r
  }\r
}\r
\r
fn get_message_block(size_bits: u32, k: u32, n: u32, input_array_length: u32) -> array<u64_pair, SHA512_MESSAGE_SCHEDULE_SIZE> {\r
  var block: array<u64_pair, SHA512_MESSAGE_SCHEDULE_SIZE>;\r
  \r
  let block_start_bit = k * 1024u;\r
  let is_final_block = (k == n - 1u);\r
\r
  for(var i = 0u; i < 16u; i++){\r
    var high: u32;\r
    var low: u32;\r
    \r
    if (is_final_block && i >= 14u) {\r
      // Length field in final block\r
      high = 0u;  // high 64 bits of length (always 0)\r
      low = select(size_bits, 0u, i == 14u);  // low 64 bits of length\r
    } else {\r
      // Message data and padding\r
      let u64_bit_start = block_start_bit + i * 64u;\r
      high = process_u32_chunk(u64_bit_start, size_bits, input_array_length);\r
      low = process_u32_chunk(u64_bit_start + 32u, size_bits, input_array_length);\r
    }\r
    \r
    block[i] = u64_pair(high, low);\r
  }\r
  \r
  return block;\r
}\r
\r
@compute @workgroup_size(1)\r
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {\r
  let input_size_bits: u32 = input_size[0];\r
  let input_array_length: u32 = (input_size_bits + 31u) / 32u;\r
  // Ceil division: (total bits with 128 length bits and 1 padding bit + 1024 - 1) divided by 1024\r
  let n: u32 = (input_size_bits + 1152u) / 1024u;\r
\r
  // FIPS PUB 180-4 Section 5.3.5\r
  var a: u64_pair = u64_pair(0x6a09e667u, 0xf3bcc908u);\r
  var b: u64_pair = u64_pair(0xbb67ae85u, 0x84caa73bu);\r
  var c: u64_pair = u64_pair(0x3c6ef372u, 0xfe94f82bu);\r
  var d: u64_pair = u64_pair(0xa54ff53au, 0x5f1d36f1u);\r
  var e: u64_pair = u64_pair(0x510e527fu, 0xade682d1u);\r
  var f: u64_pair = u64_pair(0x9b05688cu, 0x2b3e6c1fu);\r
  var g: u64_pair = u64_pair(0x1f83d9abu, 0xfb41bd6bu);\r
  var h: u64_pair = u64_pair(0x5be0cd19u, 0x137e2179u);\r
\r
  var a_previous: u64_pair = a;\r
  var b_previous: u64_pair = b;\r
  var c_previous: u64_pair = c;\r
  var d_previous: u64_pair = d;\r
  var e_previous: u64_pair = e;\r
  var f_previous: u64_pair = f;\r
  var g_previous: u64_pair = g;\r
  var h_previous: u64_pair = h;\r
\r
  // FIPS PUB 180-4 Section 6.4.2\r
  for(var i: u32 = 0u; i < n; i++){\r
    // message_schedule will only contain the first 16 messages - the 1024-bit block M(i)\r
    var message_schedule: array<u64_pair, SHA512_MESSAGE_SCHEDULE_SIZE> = get_message_block(input_size_bits, i, n, input_array_length);\r
\r
    // Calculate the rest 64 messages\r
    for(var t: u32 = 16u; t < SHA512_MESSAGE_SCHEDULE_SIZE; t++){\r
      message_schedule[t] = add_64(\r
                              add_64(\r
                                add_64(\r
                                  sigma_1(message_schedule[t - 2]),\r
                                  message_schedule[t - 7]\r
                                ),\r
                                sigma_0(message_schedule[t - 15])\r
                              ),\r
                              message_schedule[t - 16]\r
                            );\r
    }\r
\r
    // Update the hash values\r
    for(var t: u32 = 0u; t < SHA512_MESSAGE_SCHEDULE_SIZE; t++){\r
      let T1: u64_pair =  add_64(\r
                            add_64(\r
                              add_64(\r
                                add_64(\r
                                  h,\r
                                  Sigma_1(e)\r
                                ),\r
                                ch(e, f, g)\r
                              ),\r
                              K[t]\r
                            ),\r
                            message_schedule[t]\r
                          );\r
      let T2: u64_pair =  add_64(\r
                            Sigma_0(a),\r
                            maj(a, b, c)\r
                          );\r
      h = g;\r
      g = f;\r
      f = e;\r
      e = add_64(d, T1);\r
      d = c;\r
      c = b;\r
      b = a;\r
      a = add_64(T1, T2);\r
    }\r
\r
    // Compute intermediate hash\r
    a = add_64(a, a_previous);\r
    b = add_64(b, b_previous);\r
    c = add_64(c, c_previous);\r
    d = add_64(d, d_previous);\r
    e = add_64(e, e_previous);\r
    f = add_64(f, f_previous);\r
    g = add_64(g, g_previous);\r
    h = add_64(h, h_previous);\r
    a_previous = a;\r
    b_previous = b;\r
    c_previous = c;\r
    d_previous = d;\r
    e_previous = e;\r
    f_previous = f;\r
    g_previous = g;\r
    h_previous = h;\r
  }\r
\r
  // Return the final 512-bit message digest\r
  result = array<u32, 16>(\r
    a.high, a.low, b.high, b.low,\r
    c.high, c.low, d.high, d.low,\r
    e.high, e.low, f.high, f.low,\r
    g.high, g.low, h.high, h.low,\r
  );\r
}\r
`;var z0=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{},m0={exports:{}};/*
 * [js-sha512]{@link https://github.com/emn178/js-sha512}
 *
 * @version 0.9.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2024
 * @license MIT
 */var P0;function G0(){return P0||(P0=1,function(y){(function(){var b="input is invalid type",C="finalize already called",R=typeof window=="object",f=R?window:{};f.JS_SHA512_NO_WINDOW&&(R=!1);var E=!R&&typeof self=="object",i0=!f.JS_SHA512_NO_NODE_JS&&typeof process=="object"&&process.versions&&process.versions.node;i0?f=z0:E&&(f=self);var o0=!f.JS_SHA512_NO_COMMON_JS&&!0&&y.exports,U=!f.JS_SHA512_NO_ARRAY_BUFFER&&typeof ArrayBuffer<"u",r="0123456789abcdef".split(""),d0=[-2147483648,8388608,32768,128],P=[24,16,8,0],N=[1116352408,3609767458,1899447441,602891725,3049323471,3964484399,3921009573,2173295548,961987163,4081628472,1508970993,3053834265,2453635748,2937671579,2870763221,3664609560,3624381080,2734883394,310598401,1164996542,607225278,1323610764,1426881987,3590304994,1925078388,4068182383,2162078206,991336113,2614888103,633803317,3248222580,3479774868,3835390401,2666613458,4022224774,944711139,264347078,2341262773,604807628,2007800933,770255983,1495990901,1249150122,1856431235,1555081692,3175218132,1996064986,2198950837,2554220882,3999719339,2821834349,766784016,2952996808,2566594879,3210313671,3203337956,3336571891,1034457026,3584528711,2466948901,113926993,3758326383,338241895,168717936,666307205,1188179964,773529912,1546045734,1294757372,1522805485,1396182291,2643833823,1695183700,2343527390,1986661051,1014477480,2177026350,1206759142,2456956037,344077627,2730485921,1290863460,2820302411,3158454273,3259730800,3505952657,3345764771,106217008,3516065817,3606008344,3600352804,1432725776,4094571909,1467031594,275423344,851169720,430227734,3100823752,506948616,1363258195,659060556,3750685593,883997877,3785050280,958139571,3318307427,1322822218,3812723403,1537002063,2003034995,1747873779,3602036899,1955562222,1575990012,2024104815,1125592928,2227730452,2716904306,2361852424,442776044,2428436474,593698344,2756734187,3733110249,3204031479,2999351573,3329325298,3815920427,3391569614,3928383900,3515267271,566280711,3940187606,3454069534,4118630271,4000239992,116418474,1914138554,174292421,2731055270,289380356,3203993006,460393269,320620315,685471733,587496836,852142971,1086792851,1017036298,365543100,1126000580,2618297676,1288033470,3409855158,1501505948,4234509866,1607167915,987167468,1816402316,1246189591],l0=["hex","array","digest","arrayBuffer"],p=[],f0=Array.isArray;(f.JS_SHA512_NO_NODE_JS||!f0)&&(f0=function(F){return Object.prototype.toString.call(F)==="[object Array]"});var c0=ArrayBuffer.isView;U&&(f.JS_SHA512_NO_ARRAY_BUFFER_IS_VIEW||!c0)&&(c0=function(F){return typeof F=="object"&&F.buffer&&F.buffer.constructor===ArrayBuffer});var x0=function(F){var x=typeof F;if(x==="string")return[F,!0];if(x!=="object"||F===null)throw new Error(b);if(U&&F.constructor===ArrayBuffer)return[new Uint8Array(F),!1];if(!f0(F)&&!c0(F))throw new Error(b);return[F,!1]},p0=function(F,x){return function(n){return new S(x,!0).update(n)[F]()}},b0=function(F){var x=p0("hex",F);x.create=function(){return new S(F)},x.update=function(_){return x.create().update(_)};for(var n=0;n<l0.length;++n){var s=l0[n];x[s]=p0(s,F)}return x},U0=function(F,x){return function(n,s){return new _0(n,x,!0).update(s)[F]()}},g0=function(F){var x=U0("hex",F);x.create=function(_){return new _0(_,F)},x.update=function(_,a){return x.create(_).update(a)};for(var n=0;n<l0.length;++n){var s=l0[n];x[s]=U0(s,F)}return x};function S(F,x){x?(p[0]=p[1]=p[2]=p[3]=p[4]=p[5]=p[6]=p[7]=p[8]=p[9]=p[10]=p[11]=p[12]=p[13]=p[14]=p[15]=p[16]=p[17]=p[18]=p[19]=p[20]=p[21]=p[22]=p[23]=p[24]=p[25]=p[26]=p[27]=p[28]=p[29]=p[30]=p[31]=p[32]=0,this.blocks=p):this.blocks=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],F==384?(this.h0h=3418070365,this.h0l=3238371032,this.h1h=1654270250,this.h1l=914150663,this.h2h=2438529370,this.h2l=812702999,this.h3h=355462360,this.h3l=4144912697,this.h4h=1731405415,this.h4l=4290775857,this.h5h=2394180231,this.h5l=1750603025,this.h6h=3675008525,this.h6l=1694076839,this.h7h=1203062813,this.h7l=3204075428):F==256?(this.h0h=573645204,this.h0l=4230739756,this.h1h=2673172387,this.h1l=3360449730,this.h2h=596883563,this.h2l=1867755857,this.h3h=2520282905,this.h3l=1497426621,this.h4h=2519219938,this.h4l=2827943907,this.h5h=3193839141,this.h5l=1401305490,this.h6h=721525244,this.h6l=746961066,this.h7h=246885852,this.h7l=2177182882):F==224?(this.h0h=2352822216,this.h0l=424955298,this.h1h=1944164710,this.h1l=2312950998,this.h2h=502970286,this.h2l=855612546,this.h3h=1738396948,this.h3l=1479516111,this.h4h=258812777,this.h4l=2077511080,this.h5h=2011393907,this.h5l=79989058,this.h6h=1067287976,this.h6l=1780299464,this.h7h=286451373,this.h7l=2446758561):(this.h0h=1779033703,this.h0l=4089235720,this.h1h=3144134277,this.h1l=2227873595,this.h2h=1013904242,this.h2l=4271175723,this.h3h=2773480762,this.h3l=1595750129,this.h4h=1359893119,this.h4l=2917565137,this.h5h=2600822924,this.h5l=725511199,this.h6h=528734635,this.h6l=4215389547,this.h7h=1541459225,this.h7l=327033209),this.bits=F,this.block=this.start=this.bytes=this.hBytes=0,this.finalized=this.hashed=!1}S.prototype.update=function(F){if(this.finalized)throw new Error(C);var x=x0(F);F=x[0];for(var n=x[1],s,_=0,a,v=F.length,h=this.blocks;_<v;){if(this.hashed&&(this.hashed=!1,h[0]=this.block,this.block=h[1]=h[2]=h[3]=h[4]=h[5]=h[6]=h[7]=h[8]=h[9]=h[10]=h[11]=h[12]=h[13]=h[14]=h[15]=h[16]=h[17]=h[18]=h[19]=h[20]=h[21]=h[22]=h[23]=h[24]=h[25]=h[26]=h[27]=h[28]=h[29]=h[30]=h[31]=h[32]=0),n)for(a=this.start;_<v&&a<128;++_)s=F.charCodeAt(_),s<128?h[a>>>2]|=s<<P[a++&3]:s<2048?(h[a>>>2]|=(192|s>>>6)<<P[a++&3],h[a>>>2]|=(128|s&63)<<P[a++&3]):s<55296||s>=57344?(h[a>>>2]|=(224|s>>>12)<<P[a++&3],h[a>>>2]|=(128|s>>>6&63)<<P[a++&3],h[a>>>2]|=(128|s&63)<<P[a++&3]):(s=65536+((s&1023)<<10|F.charCodeAt(++_)&1023),h[a>>>2]|=(240|s>>>18)<<P[a++&3],h[a>>>2]|=(128|s>>>12&63)<<P[a++&3],h[a>>>2]|=(128|s>>>6&63)<<P[a++&3],h[a>>>2]|=(128|s&63)<<P[a++&3]);else for(a=this.start;_<v&&a<128;++_)h[a>>>2]|=F[_]<<P[a++&3];this.lastByteIndex=a,this.bytes+=a-this.start,a>=128?(this.block=h[32],this.start=a-128,this.hash(),this.hashed=!0):this.start=a}return this.bytes>4294967295&&(this.hBytes+=this.bytes/4294967296<<0,this.bytes=this.bytes%4294967296),this},S.prototype.finalize=function(){if(!this.finalized){this.finalized=!0;var F=this.blocks,x=this.lastByteIndex;F[32]=this.block,F[x>>>2]|=d0[x&3],this.block=F[32],x>=112&&(this.hashed||this.hash(),F[0]=this.block,F[1]=F[2]=F[3]=F[4]=F[5]=F[6]=F[7]=F[8]=F[9]=F[10]=F[11]=F[12]=F[13]=F[14]=F[15]=F[16]=F[17]=F[18]=F[19]=F[20]=F[21]=F[22]=F[23]=F[24]=F[25]=F[26]=F[27]=F[28]=F[29]=F[30]=F[31]=F[32]=0),F[30]=this.hBytes<<3|this.bytes>>>29,F[31]=this.bytes<<3,this.hash()}},S.prototype.hash=function(){var F=this.h0h,x=this.h0l,n=this.h1h,s=this.h1l,_=this.h2h,a=this.h2l,v=this.h3h,h=this.h3l,d=this.h4h,D=this.h4l,w=this.h5h,m=this.h5l,O=this.h6h,T=this.h6l,I=this.h7h,z=this.h7l,B=this.blocks,c,k,W,j,J,t,e,i,u,E0,C0,v0,y0,S0,D0,A0,B0,a0,n0,o,l,g,A,s0,u0;for(c=32;c<160;c+=2)o=B[c-30],l=B[c-29],k=(o>>>1|l<<31)^(o>>>8|l<<24)^o>>>7,W=(l>>>1|o<<31)^(l>>>8|o<<24)^(l>>>7|o<<25),o=B[c-4],l=B[c-3],j=(o>>>19|l<<13)^(l>>>29|o<<3)^o>>>6,J=(l>>>19|o<<13)^(o>>>29|l<<3)^(l>>>6|o<<26),o=B[c-32],l=B[c-31],g=B[c-14],A=B[c-13],t=(A&65535)+(l&65535)+(W&65535)+(J&65535),e=(A>>>16)+(l>>>16)+(W>>>16)+(J>>>16)+(t>>>16),i=(g&65535)+(o&65535)+(k&65535)+(j&65535)+(e>>>16),u=(g>>>16)+(o>>>16)+(k>>>16)+(j>>>16)+(i>>>16),B[c]=u<<16|i&65535,B[c+1]=e<<16|t&65535;var X=F,K=x,G=n,H=s,M=_,L=a,$=v,q=h,V=d,Y=D,Z=w,Q=m,r0=O,F0=T,t0=I,e0=z;for(A0=G&M,B0=H&L,c=0;c<160;c+=8)k=(X>>>28|K<<4)^(K>>>2|X<<30)^(K>>>7|X<<25),W=(K>>>28|X<<4)^(X>>>2|K<<30)^(X>>>7|K<<25),j=(V>>>14|Y<<18)^(V>>>18|Y<<14)^(Y>>>9|V<<23),J=(Y>>>14|V<<18)^(Y>>>18|V<<14)^(V>>>9|Y<<23),E0=X&G,C0=K&H,a0=E0^X&M^A0,n0=C0^K&L^B0,s0=V&Z^~V&r0,u0=Y&Q^~Y&F0,o=B[c],l=B[c+1],g=N[c],A=N[c+1],t=(A&65535)+(l&65535)+(u0&65535)+(J&65535)+(e0&65535),e=(A>>>16)+(l>>>16)+(u0>>>16)+(J>>>16)+(e0>>>16)+(t>>>16),i=(g&65535)+(o&65535)+(s0&65535)+(j&65535)+(t0&65535)+(e>>>16),u=(g>>>16)+(o>>>16)+(s0>>>16)+(j>>>16)+(t0>>>16)+(i>>>16),o=u<<16|i&65535,l=e<<16|t&65535,t=(n0&65535)+(W&65535),e=(n0>>>16)+(W>>>16)+(t>>>16),i=(a0&65535)+(k&65535)+(e>>>16),u=(a0>>>16)+(k>>>16)+(i>>>16),g=u<<16|i&65535,A=e<<16|t&65535,t=(q&65535)+(l&65535),e=(q>>>16)+(l>>>16)+(t>>>16),i=($&65535)+(o&65535)+(e>>>16),u=($>>>16)+(o>>>16)+(i>>>16),t0=u<<16|i&65535,e0=e<<16|t&65535,t=(A&65535)+(l&65535),e=(A>>>16)+(l>>>16)+(t>>>16),i=(g&65535)+(o&65535)+(e>>>16),u=(g>>>16)+(o>>>16)+(i>>>16),$=u<<16|i&65535,q=e<<16|t&65535,k=($>>>28|q<<4)^(q>>>2|$<<30)^(q>>>7|$<<25),W=(q>>>28|$<<4)^($>>>2|q<<30)^($>>>7|q<<25),j=(t0>>>14|e0<<18)^(t0>>>18|e0<<14)^(e0>>>9|t0<<23),J=(e0>>>14|t0<<18)^(e0>>>18|t0<<14)^(t0>>>9|e0<<23),v0=$&X,y0=q&K,a0=v0^$&G^E0,n0=y0^q&H^C0,s0=t0&V^~t0&Z,u0=e0&Y^~e0&Q,o=B[c+2],l=B[c+3],g=N[c+2],A=N[c+3],t=(A&65535)+(l&65535)+(u0&65535)+(J&65535)+(F0&65535),e=(A>>>16)+(l>>>16)+(u0>>>16)+(J>>>16)+(F0>>>16)+(t>>>16),i=(g&65535)+(o&65535)+(s0&65535)+(j&65535)+(r0&65535)+(e>>>16),u=(g>>>16)+(o>>>16)+(s0>>>16)+(j>>>16)+(r0>>>16)+(i>>>16),o=u<<16|i&65535,l=e<<16|t&65535,t=(n0&65535)+(W&65535),e=(n0>>>16)+(W>>>16)+(t>>>16),i=(a0&65535)+(k&65535)+(e>>>16),u=(a0>>>16)+(k>>>16)+(i>>>16),g=u<<16|i&65535,A=e<<16|t&65535,t=(L&65535)+(l&65535),e=(L>>>16)+(l>>>16)+(t>>>16),i=(M&65535)+(o&65535)+(e>>>16),u=(M>>>16)+(o>>>16)+(i>>>16),r0=u<<16|i&65535,F0=e<<16|t&65535,t=(A&65535)+(l&65535),e=(A>>>16)+(l>>>16)+(t>>>16),i=(g&65535)+(o&65535)+(e>>>16),u=(g>>>16)+(o>>>16)+(i>>>16),M=u<<16|i&65535,L=e<<16|t&65535,k=(M>>>28|L<<4)^(L>>>2|M<<30)^(L>>>7|M<<25),W=(L>>>28|M<<4)^(M>>>2|L<<30)^(M>>>7|L<<25),j=(r0>>>14|F0<<18)^(r0>>>18|F0<<14)^(F0>>>9|r0<<23),J=(F0>>>14|r0<<18)^(F0>>>18|r0<<14)^(r0>>>9|F0<<23),S0=M&$,D0=L&q,a0=S0^M&X^v0,n0=D0^L&K^y0,s0=r0&t0^~r0&V,u0=F0&e0^~F0&Y,o=B[c+4],l=B[c+5],g=N[c+4],A=N[c+5],t=(A&65535)+(l&65535)+(u0&65535)+(J&65535)+(Q&65535),e=(A>>>16)+(l>>>16)+(u0>>>16)+(J>>>16)+(Q>>>16)+(t>>>16),i=(g&65535)+(o&65535)+(s0&65535)+(j&65535)+(Z&65535)+(e>>>16),u=(g>>>16)+(o>>>16)+(s0>>>16)+(j>>>16)+(Z>>>16)+(i>>>16),o=u<<16|i&65535,l=e<<16|t&65535,t=(n0&65535)+(W&65535),e=(n0>>>16)+(W>>>16)+(t>>>16),i=(a0&65535)+(k&65535)+(e>>>16),u=(a0>>>16)+(k>>>16)+(i>>>16),g=u<<16|i&65535,A=e<<16|t&65535,t=(H&65535)+(l&65535),e=(H>>>16)+(l>>>16)+(t>>>16),i=(G&65535)+(o&65535)+(e>>>16),u=(G>>>16)+(o>>>16)+(i>>>16),Z=u<<16|i&65535,Q=e<<16|t&65535,t=(A&65535)+(l&65535),e=(A>>>16)+(l>>>16)+(t>>>16),i=(g&65535)+(o&65535)+(e>>>16),u=(g>>>16)+(o>>>16)+(i>>>16),G=u<<16|i&65535,H=e<<16|t&65535,k=(G>>>28|H<<4)^(H>>>2|G<<30)^(H>>>7|G<<25),W=(H>>>28|G<<4)^(G>>>2|H<<30)^(G>>>7|H<<25),j=(Z>>>14|Q<<18)^(Z>>>18|Q<<14)^(Q>>>9|Z<<23),J=(Q>>>14|Z<<18)^(Q>>>18|Z<<14)^(Z>>>9|Q<<23),A0=G&M,B0=H&L,a0=A0^G&$^S0,n0=B0^H&q^D0,s0=Z&r0^~Z&t0,u0=Q&F0^~Q&e0,o=B[c+6],l=B[c+7],g=N[c+6],A=N[c+7],t=(A&65535)+(l&65535)+(u0&65535)+(J&65535)+(Y&65535),e=(A>>>16)+(l>>>16)+(u0>>>16)+(J>>>16)+(Y>>>16)+(t>>>16),i=(g&65535)+(o&65535)+(s0&65535)+(j&65535)+(V&65535)+(e>>>16),u=(g>>>16)+(o>>>16)+(s0>>>16)+(j>>>16)+(V>>>16)+(i>>>16),o=u<<16|i&65535,l=e<<16|t&65535,t=(n0&65535)+(W&65535),e=(n0>>>16)+(W>>>16)+(t>>>16),i=(a0&65535)+(k&65535)+(e>>>16),u=(a0>>>16)+(k>>>16)+(i>>>16),g=u<<16|i&65535,A=e<<16|t&65535,t=(K&65535)+(l&65535),e=(K>>>16)+(l>>>16)+(t>>>16),i=(X&65535)+(o&65535)+(e>>>16),u=(X>>>16)+(o>>>16)+(i>>>16),V=u<<16|i&65535,Y=e<<16|t&65535,t=(A&65535)+(l&65535),e=(A>>>16)+(l>>>16)+(t>>>16),i=(g&65535)+(o&65535)+(e>>>16),u=(g>>>16)+(o>>>16)+(i>>>16),X=u<<16|i&65535,K=e<<16|t&65535;t=(x&65535)+(K&65535),e=(x>>>16)+(K>>>16)+(t>>>16),i=(F&65535)+(X&65535)+(e>>>16),u=(F>>>16)+(X>>>16)+(i>>>16),this.h0h=u<<16|i&65535,this.h0l=e<<16|t&65535,t=(s&65535)+(H&65535),e=(s>>>16)+(H>>>16)+(t>>>16),i=(n&65535)+(G&65535)+(e>>>16),u=(n>>>16)+(G>>>16)+(i>>>16),this.h1h=u<<16|i&65535,this.h1l=e<<16|t&65535,t=(a&65535)+(L&65535),e=(a>>>16)+(L>>>16)+(t>>>16),i=(_&65535)+(M&65535)+(e>>>16),u=(_>>>16)+(M>>>16)+(i>>>16),this.h2h=u<<16|i&65535,this.h2l=e<<16|t&65535,t=(h&65535)+(q&65535),e=(h>>>16)+(q>>>16)+(t>>>16),i=(v&65535)+($&65535)+(e>>>16),u=(v>>>16)+($>>>16)+(i>>>16),this.h3h=u<<16|i&65535,this.h3l=e<<16|t&65535,t=(D&65535)+(Y&65535),e=(D>>>16)+(Y>>>16)+(t>>>16),i=(d&65535)+(V&65535)+(e>>>16),u=(d>>>16)+(V>>>16)+(i>>>16),this.h4h=u<<16|i&65535,this.h4l=e<<16|t&65535,t=(m&65535)+(Q&65535),e=(m>>>16)+(Q>>>16)+(t>>>16),i=(w&65535)+(Z&65535)+(e>>>16),u=(w>>>16)+(Z>>>16)+(i>>>16),this.h5h=u<<16|i&65535,this.h5l=e<<16|t&65535,t=(T&65535)+(F0&65535),e=(T>>>16)+(F0>>>16)+(t>>>16),i=(O&65535)+(r0&65535)+(e>>>16),u=(O>>>16)+(r0>>>16)+(i>>>16),this.h6h=u<<16|i&65535,this.h6l=e<<16|t&65535,t=(z&65535)+(e0&65535),e=(z>>>16)+(e0>>>16)+(t>>>16),i=(I&65535)+(t0&65535)+(e>>>16),u=(I>>>16)+(t0>>>16)+(i>>>16),this.h7h=u<<16|i&65535,this.h7l=e<<16|t&65535},S.prototype.hex=function(){this.finalize();var F=this.h0h,x=this.h0l,n=this.h1h,s=this.h1l,_=this.h2h,a=this.h2l,v=this.h3h,h=this.h3l,d=this.h4h,D=this.h4l,w=this.h5h,m=this.h5l,O=this.h6h,T=this.h6l,I=this.h7h,z=this.h7l,B=this.bits,c=r[F>>>28&15]+r[F>>>24&15]+r[F>>>20&15]+r[F>>>16&15]+r[F>>>12&15]+r[F>>>8&15]+r[F>>>4&15]+r[F&15]+r[x>>>28&15]+r[x>>>24&15]+r[x>>>20&15]+r[x>>>16&15]+r[x>>>12&15]+r[x>>>8&15]+r[x>>>4&15]+r[x&15]+r[n>>>28&15]+r[n>>>24&15]+r[n>>>20&15]+r[n>>>16&15]+r[n>>>12&15]+r[n>>>8&15]+r[n>>>4&15]+r[n&15]+r[s>>>28&15]+r[s>>>24&15]+r[s>>>20&15]+r[s>>>16&15]+r[s>>>12&15]+r[s>>>8&15]+r[s>>>4&15]+r[s&15]+r[_>>>28&15]+r[_>>>24&15]+r[_>>>20&15]+r[_>>>16&15]+r[_>>>12&15]+r[_>>>8&15]+r[_>>>4&15]+r[_&15]+r[a>>>28&15]+r[a>>>24&15]+r[a>>>20&15]+r[a>>>16&15]+r[a>>>12&15]+r[a>>>8&15]+r[a>>>4&15]+r[a&15]+r[v>>>28&15]+r[v>>>24&15]+r[v>>>20&15]+r[v>>>16&15]+r[v>>>12&15]+r[v>>>8&15]+r[v>>>4&15]+r[v&15];return B>=256&&(c+=r[h>>>28&15]+r[h>>>24&15]+r[h>>>20&15]+r[h>>>16&15]+r[h>>>12&15]+r[h>>>8&15]+r[h>>>4&15]+r[h&15]),B>=384&&(c+=r[d>>>28&15]+r[d>>>24&15]+r[d>>>20&15]+r[d>>>16&15]+r[d>>>12&15]+r[d>>>8&15]+r[d>>>4&15]+r[d&15]+r[D>>>28&15]+r[D>>>24&15]+r[D>>>20&15]+r[D>>>16&15]+r[D>>>12&15]+r[D>>>8&15]+r[D>>>4&15]+r[D&15]+r[w>>>28&15]+r[w>>>24&15]+r[w>>>20&15]+r[w>>>16&15]+r[w>>>12&15]+r[w>>>8&15]+r[w>>>4&15]+r[w&15]+r[m>>>28&15]+r[m>>>24&15]+r[m>>>20&15]+r[m>>>16&15]+r[m>>>12&15]+r[m>>>8&15]+r[m>>>4&15]+r[m&15]),B==512&&(c+=r[O>>>28&15]+r[O>>>24&15]+r[O>>>20&15]+r[O>>>16&15]+r[O>>>12&15]+r[O>>>8&15]+r[O>>>4&15]+r[O&15]+r[T>>>28&15]+r[T>>>24&15]+r[T>>>20&15]+r[T>>>16&15]+r[T>>>12&15]+r[T>>>8&15]+r[T>>>4&15]+r[T&15]+r[I>>>28&15]+r[I>>>24&15]+r[I>>>20&15]+r[I>>>16&15]+r[I>>>12&15]+r[I>>>8&15]+r[I>>>4&15]+r[I&15]+r[z>>>28&15]+r[z>>>24&15]+r[z>>>20&15]+r[z>>>16&15]+r[z>>>12&15]+r[z>>>8&15]+r[z>>>4&15]+r[z&15]),c},S.prototype.toString=S.prototype.hex,S.prototype.digest=function(){this.finalize();var F=this.h0h,x=this.h0l,n=this.h1h,s=this.h1l,_=this.h2h,a=this.h2l,v=this.h3h,h=this.h3l,d=this.h4h,D=this.h4l,w=this.h5h,m=this.h5l,O=this.h6h,T=this.h6l,I=this.h7h,z=this.h7l,B=this.bits,c=[F>>>24&255,F>>>16&255,F>>>8&255,F&255,x>>>24&255,x>>>16&255,x>>>8&255,x&255,n>>>24&255,n>>>16&255,n>>>8&255,n&255,s>>>24&255,s>>>16&255,s>>>8&255,s&255,_>>>24&255,_>>>16&255,_>>>8&255,_&255,a>>>24&255,a>>>16&255,a>>>8&255,a&255,v>>>24&255,v>>>16&255,v>>>8&255,v&255];return B>=256&&c.push(h>>>24&255,h>>>16&255,h>>>8&255,h&255),B>=384&&c.push(d>>>24&255,d>>>16&255,d>>>8&255,d&255,D>>>24&255,D>>>16&255,D>>>8&255,D&255,w>>>24&255,w>>>16&255,w>>>8&255,w&255,m>>>24&255,m>>>16&255,m>>>8&255,m&255),B==512&&c.push(O>>>24&255,O>>>16&255,O>>>8&255,O&255,T>>>24&255,T>>>16&255,T>>>8&255,T&255,I>>>24&255,I>>>16&255,I>>>8&255,I&255,z>>>24&255,z>>>16&255,z>>>8&255,z&255),c},S.prototype.array=S.prototype.digest,S.prototype.arrayBuffer=function(){this.finalize();var F=this.bits,x=new ArrayBuffer(F/8),n=new DataView(x);return n.setUint32(0,this.h0h),n.setUint32(4,this.h0l),n.setUint32(8,this.h1h),n.setUint32(12,this.h1l),n.setUint32(16,this.h2h),n.setUint32(20,this.h2l),n.setUint32(24,this.h3h),F>=256&&n.setUint32(28,this.h3l),F>=384&&(n.setUint32(32,this.h4h),n.setUint32(36,this.h4l),n.setUint32(40,this.h5h),n.setUint32(44,this.h5l)),F==512&&(n.setUint32(48,this.h6h),n.setUint32(52,this.h6l),n.setUint32(56,this.h7h),n.setUint32(60,this.h7l)),x},S.prototype.clone=function(){var F=new S(this.bits,!1);return this.copyTo(F),F},S.prototype.copyTo=function(F){var x=0,n=["h0h","h0l","h1h","h1l","h2h","h2l","h3h","h3l","h4h","h4l","h5h","h5l","h6h","h6l","h7h","h7l","start","bytes","hBytes","finalized","hashed","lastByteIndex"];for(x=0;x<n.length;++x)F[n[x]]=this[n[x]];for(x=0;x<this.blocks.length;++x)F.blocks[x]=this.blocks[x]};function _0(F,x,n){var s,_=x0(F);if(F=_[0],_[1]){for(var a=[],v=F.length,h=0,d,s=0;s<v;++s)d=F.charCodeAt(s),d<128?a[h++]=d:d<2048?(a[h++]=192|d>>>6,a[h++]=128|d&63):d<55296||d>=57344?(a[h++]=224|d>>>12,a[h++]=128|d>>>6&63,a[h++]=128|d&63):(d=65536+((d&1023)<<10|F.charCodeAt(++s)&1023),a[h++]=240|d>>>18,a[h++]=128|d>>>12&63,a[h++]=128|d>>>6&63,a[h++]=128|d&63);F=a}F.length>128&&(F=new S(x,!0).update(F).array());for(var D=[],w=[],s=0;s<128;++s){var m=F[s]||0;D[s]=92^m,w[s]=54^m}S.call(this,x,n),this.update(w),this.oKeyPad=D,this.inner=!0,this.sharedMemory=n}_0.prototype=new S,_0.prototype.finalize=function(){if(S.prototype.finalize.call(this),this.inner){this.inner=!1;var F=this.array();S.call(this,this.bits,this.sharedMemory),this.update(this.oKeyPad),this.update(F),S.prototype.finalize.call(this)}},_0.prototype.clone=function(){var F=new _0([],this.bits,!1);this.copyTo(F),F.inner=this.inner;for(var x=0;x<this.oKeyPad.length;++x)F.oKeyPad[x]=this.oKeyPad[x];return F};var h0=b0(512);h0.sha512=h0,h0.sha384=b0(384),h0.sha512_256=b0(256),h0.sha512_224=b0(224),h0.sha512.hmac=g0(512),h0.sha384.hmac=g0(384),h0.sha512_256.hmac=g0(256),h0.sha512_224.hmac=g0(224),o0?y.exports=h0:(f.sha512=h0.sha512,f.sha384=h0.sha384,f.sha512_256=h0.sha512_256,f.sha512_224=h0.sha512_224)})()}(m0)),m0.exports}var R0=G0();class H0{constructor(){w0(this,"device",null);w0(this,"shaderCode","")}async init(){if(!navigator.gpu)throw alert("WebGPU not supported in this environment"),new Error("WebGPU not supported in this environment");const b=await navigator.gpu.requestAdapter();if(!b)throw alert("No appropriate GPUAdapter found"),new Error("No appropriate GPUAdapter found");this.device=await b.requestDevice();try{this.shaderCode=I0}catch{throw new Error("Could not read sha512.wgsl file. Make sure it exists in the current directory.")}}stringToU32Array(b){const R=new TextEncoder().encode(b),f=Math.ceil(R.length/4)*4,E=new Uint8Array(f);E.set(R);const i0=new Uint32Array(f/4);for(let o0=0;o0<i0.length;o0++){const U=o0*4;i0[o0]=E[U]<<24|E[U+1]<<16|E[U+2]<<8|E[U+3]}return i0}async computeHash(b){if(!this.device)throw new Error("Device not initialized. Call init() first.");const C=this.stringToU32Array(b),R=new TextEncoder().encode(b).length,f=this.device.createShaderModule({code:this.shaderCode}),E=this.device.createBuffer({size:Math.max(C.byteLength,16),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),i0=this.device.createBuffer({size:4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),o0=this.device.createBuffer({size:64*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),U=this.device.createBuffer({size:64*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});this.device.queue.writeBuffer(E,0,new Uint32Array(C)),this.device.queue.writeBuffer(i0,0,new Uint32Array([R*8]));const r=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}]}),d0=this.device.createBindGroup({layout:r,entries:[{binding:0,resource:{buffer:E}},{binding:1,resource:{buffer:i0}},{binding:2,resource:{buffer:o0}}]}),P=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[r]}),compute:{module:f,entryPoint:"main"}}),N=this.device.createCommandEncoder(),l0=N.beginComputePass();l0.setPipeline(P),l0.setBindGroup(0,d0),l0.dispatchWorkgroups(1),l0.end(),N.copyBufferToBuffer(o0,0,U,0,64*4),this.device.queue.submit([N.finish()]),await U.mapAsync(GPUMapMode.READ);const p=U.getMappedRange(),f0=new Uint32Array(p.slice(0));U.unmap();const c0=new Uint8Array(64);for(let x0=0;x0<16;x0++){const p0=f0[x0];c0[x0*4+0]=p0>>>24&255,c0[x0*4+1]=p0>>>16&255,c0[x0*4+2]=p0>>>8&255,c0[x0*4+3]=p0&255}return Array.from(c0).map(x0=>x0.toString(16).padStart(2,"0")).join("")}generateRandomString(b){const C="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";let R="";for(let f=0;f<b;f++)R+=C.charAt(Math.floor(Math.random()*C.length));return R}verifyWithJsCrypto(b,C){return R0.sha512.create().update(b).hex()===C}}async function M0(){try{console.log("🚀 Starting SHA-512 WebGPU Test"),console.log("================================");const y=new H0;await y.init();const b=["Hello, World!","The quick brown fox jumps over the lazy dog",y.generateRandomString(50),y.generateRandomString(100),"","!","SHA-512 test with WebGPU implementation using WGSL shaders!"];console.log(`Running test cases...
`);for(let U=0;U<b.length;U++){const r=b[U],d0=r.length>50?r.substring(0,47)+"...":r;console.log(`Test ${U+1}: "${d0}"`),console.log(`Input length: ${r.length} characters`);try{const P=performance.now(),N=await y.computeHash(r),l0=performance.now();console.log(`WebGPU Result: ${N}`);const p=y.verifyWithJsCrypto(r,N),f0=R0.sha512.create().update(r).hex();console.log(`JS Result: ${f0}`),console.log(`✅ Verification: ${p?"PASSED":"FAILED"}`),console.log(`⏱️  Computation time (most of it is JS pre- and post-computations): ${(l0-P).toFixed(2)}ms`),p||console.log("❌ Hash mismatch detected!")}catch(P){console.log(`❌ Error: ${P}`)}console.log("─".repeat(80))}console.log(`
🏃 Performance Test with Random Large Data`),console.log("====================================");const C=y.generateRandomString(1e4);console.log(`Testing with ${C.length} character string...`);const R=performance.now(),f=await y.computeHash(C),E=performance.now();console.log(`Result: ${f}`),console.log(`⏱️  Large data computation time (most of it is JS pre- and post-computations): ${(E-R).toFixed(2)}ms`);const i0=y.verifyWithJsCrypto(C,f),o0=R0.sha512.create().update(C).hex();console.log(`JS Result: ${o0}`),console.log(`✅ Large data verification: ${i0?"PASSED":"FAILED"}`)}catch(y){console.error("❌ Error:",y)}}M0().catch(console.error);
