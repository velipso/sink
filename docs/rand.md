
Random Number Generator
=======================

```c
// RNG has 64-bit state
static uint32_t seed, i;

void rand_seed(uint32_t s){
  seed = s;
  i = 0;
}

uint32_t rand_int(){
  uint32_t m = 0x5bd1e995;
  uint32_t k = i++ * m;
  seed = (k ^ (k >> 24) ^ (seed * m)) * m;
  return seed ^ (seed >> 13);
}

double rand_num(){
  uint64_t M1 = rand_int();
  uint64_t M2 = rand_int();
  uint64_t M = (M1 << 20) | (M2 >> 12); // 52 bit random number
  union { uint64_t i; double d; } u = {
    .i = UINT64_C(0x3FF) << 52 | M
  };
  return u.d - 1.0;
}

double rand_range(double start, double stop, double step){
  double count = ceil((stop - start) / step);
  return start + floor(rand_num() * count) * step;
}

void rand_getstate(uint32_t *state){
  state[0] = seed;
  state[1] = i;
}

void rand_setstate(const uint32_t *state){
  seed = state[0];
  i = state[1];
}
```
