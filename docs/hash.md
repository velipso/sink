
String Hash Function
====================

The `str.hash` command is defined as [Murmur3_x64_128](https://github.com/aappleby/smhasher), and
returns the same results on all platforms, given the same input.  Murmur3 is known as a fast and
high quality non-cryptographic hash function.

The `str.hash` command will return a list of four numbers, each 32-bit unsigned integers.

The seed parameter is optional, and defaults to 0.  Changing the seed is useful for generating
different hashes for the same input.

```c
// MurmurHash3 was written by Austin Appleby, and is placed in the public
// domain. The author hereby disclaims copyright to this source code.
// https://github.com/aappleby/smhasher

static inline uint64_t rotl64(uint64_t x, int8_t r){
  return (x << r) | (x >> (64 - r));
}

static inline uint64_t fmix64(uint64_t k){
  k ^= k >> 33;
  k *= UINT64_C(0xFF51AFD7ED558CCD);
  k ^= k >> 33;
  k *= UINT64_C(0xC4CEB9FE1A85EC53);
  k ^= k >> 33;
  return k;
}

void str_hash(const uint8_t *str, uint64_t len, uint32_t seed, uint32_t *out){
  uint64_t nblocks = len >> 4;

  uint64_t h1 = seed;
  uint64_t h2 = seed;

  uint64_t c1 = UINT64_C(0x87C37B91114253D5);
  uint64_t c2 = UINT64_C(0x4CF5AD432745937F);

  for (uint64_t i = 0; i < nblocks; i++){
    uint64_t ki = i * 16;
    uint64_t k1 =
      ((uint64_t)str[ki +  0]      ) |
      ((uint64_t)str[ki +  1] <<  8) |
      ((uint64_t)str[ki +  2] << 16) |
      ((uint64_t)str[ki +  3] << 24) |
      ((uint64_t)str[ki +  4] << 32) |
      ((uint64_t)str[ki +  5] << 40) |
      ((uint64_t)str[ki +  6] << 48) |
      ((uint64_t)str[ki +  7] << 56);
    uint64_t k2 =
      ((uint64_t)str[ki +  8]      ) |
      ((uint64_t)str[ki +  9] <<  8) |
      ((uint64_t)str[ki + 10] << 16) |
      ((uint64_t)str[ki + 11] << 24) |
      ((uint64_t)str[ki + 12] << 32) |
      ((uint64_t)str[ki + 13] << 40) |
      ((uint64_t)str[ki + 14] << 48) |
      ((uint64_t)str[ki + 15] << 56);

    k1 *= c1;
    k1 = rotl64(k1, 31);
    k1 *= c2;
    h1 ^= k1;

    h1 = rotl64(h1, 27);
    h1 += h2;
    h1 = h1 * 5 + 0x52DCE729;

    k2 *= c2;
    k2 = rotl64(k2, 33);
    k2 *= c1;
    h2 ^= k2;

    h2 = rotl64(h2, 31);
    h2 += h1;
    h2 = h2 * 5 + 0x38495AB5;
  }

  const uint8_t *tail = &str[nblocks << 4];

  uint64_t k1 = 0;
  uint64_t k2 = 0;

  switch(len & 15) {
    case 15: k2 ^= (uint64_t)(tail[14]) << 48;
    case 14: k2 ^= (uint64_t)(tail[13]) << 40;
    case 13: k2 ^= (uint64_t)(tail[12]) << 32;
    case 12: k2 ^= (uint64_t)(tail[11]) << 24;
    case 11: k2 ^= (uint64_t)(tail[10]) << 16;
    case 10: k2 ^= (uint64_t)(tail[ 9]) << 8;
    case  9: k2 ^= (uint64_t)(tail[ 8]) << 0;

    k2 *= c2;
    k2 = rotl64(k2, 33);
    k2 *= c1;
    h2 ^= k2;

    case  8: k1 ^= (uint64_t)(tail[ 7]) << 56;
    case  7: k1 ^= (uint64_t)(tail[ 6]) << 48;
    case  6: k1 ^= (uint64_t)(tail[ 5]) << 40;
    case  5: k1 ^= (uint64_t)(tail[ 4]) << 32;
    case  4: k1 ^= (uint64_t)(tail[ 3]) << 24;
    case  3: k1 ^= (uint64_t)(tail[ 2]) << 16;
    case  2: k1 ^= (uint64_t)(tail[ 1]) << 8;
    case  1: k1 ^= (uint64_t)(tail[ 0]) << 0;

    k1 *= c1;
    k1 = rotl64(k1, 31);
    k1 *= c2;
    h1 ^= k1;
  }

  h1 ^= len;
  h2 ^= len;

  h1 += h2;
  h2 += h1;

  h1 = fmix64(h1);
  h2 = fmix64(h2);

  h1 += h2;
  h2 += h1;

  out[0] = h1 & 0xFFFFFFFF;
  out[1] = h1 >> 32;
  out[2] = h2 & 0xFFFFFFFF;
  out[3] = h2 >> 32;
}
```

```
str.hash 'hello, world', 123   # => {3439238593,  804096095, 2029097957, 3684287146}
str.hash 'demon produce aisle' # => {2133076460, 2322631415, 1728380306, 2686374473}
```
