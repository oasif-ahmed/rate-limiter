export type TokenBucket = {
    tokens: number;
    lastRefilTime: number;
    capacity: number;
    refilRate: number
}

export const createTokenBucket = (capacity: number, refilRate: number): TokenBucket => {
    return {
        tokens: capacity,
        lastRefilTime: Date.now() / 1000,
        capacity,
        refilRate
    }
}


// create a refil bucket function

export const refilBucket = (bucket: TokenBucket): void => {
    const now = Date.now();

    const elapsedSeconds = (now - bucket.lastRefilTime) / 1000;

    const tokensToAdd = elapsedSeconds * bucket.refilRate;

    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);

    bucket.lastRefilTime = now;
}


export const tryConsumeBucket = (bucket: TokenBucket): boolean => {
    refilBucket(bucket);

    if(bucket.tokens < 1){
        return false;
    }

    bucket.tokens -= 1;

    return true;
}
