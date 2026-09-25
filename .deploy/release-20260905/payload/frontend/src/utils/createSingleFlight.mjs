export default function createSingleFlight() {
  const inFlightRequests = new Map();

  return (requestFactory, key = 'default') => {
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key);
    }

    const request = Promise.resolve()
      .then(requestFactory)
      .finally(() => {
        if (inFlightRequests.get(key) === request) {
          inFlightRequests.delete(key);
        }
      });

    inFlightRequests.set(key, request);

    return request;
  };
}
