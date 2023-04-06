# cloud-benchmark
Simple application to measure performance (CPU, network throughput).

## CPU benchmark

`GET /prime/{n}` - calculates the smallest prime number bigger or equal to n. Sample result: `{"n":"24", "prime":29, "msTime":1}`


## Latency/throughput benchmark

`GET /recursive/{n}?url={baseUrl}` - calculates the n-th number in the Fibonacci sequence with a very ineffective algorithm calling the same service with the values `n-1` and `n-2` and returning the sum of them. The bigger the number the number of recursive calls grows exponentially. Optionally you can pass a `url` query parameter that will be used for recursive calls, like `baseUrl/recursive/{n}`. If not provided the `url` used for initial call will be used.

# Run with docker

```
docker run -p 3000:3000 ghcr.io/pbochynski/cloud-benchmark
```

## Cloud Foundry deployment 

`cf push bench --docker-image pbochynski/cloud-benchmark`


## Kubernetes (Kyma) deployment

```
kubectl create deployment bench --image ghcr.io/pbochynski/cloud-benchmark
kubectl create service clusterip bench --tcp=3000:3000
```

Expose the service with the external URL:
```
cat <<EOF |kubectl apply -f -
apiVersion: gateway.kyma-project.io/v1beta1
kind: APIRule
metadata:
  name: bench
  labels:
    app.kubernetes.io/name: bench
  annotations: {}
  namespace: default
spec:
  gateway: kyma-gateway.kyma-system.svc.cluster.local
  rules:
    - path: /.*
      methods:
        - GET
      accessStrategies:
        - handler: allow
  host: bench
  service:
    name: bench
    port: 3000
EOF
```
