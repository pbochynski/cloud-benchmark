# cloud-benchmark

The `cloud-benchmark` is a test application for checking the cloud offering performance. When you deploy the application to the target environment you can test:
- CPU speed
- network latency


## CPU benchmark

`GET /prime/{n}` - calculates the smallest prime number bigger or equal to n. Sample result: `{"n":"24", "prime":29, "msTime":1}`

The CPU benchmark is based on prime number calculation. The algorithm starts from the number provided in the request and checks if it is the prime number by dividing it by all the numbers from 2 to n/2 and checking the remainder left. If the remainder left is 0 then it means it is not a prime number, and the next number is evaluated. 

Sample execution times in milliseconds for different platforms:

| Initial number | n1-standard machines (Cloud Foundry on GCP) | n2-standard machines (Kubernetes on GCP)  | 2,3 GHz 8-Core Intel Core i9 (MacBook Pro) |
|---|---|---|---|
| 2.000.000.000 | 5113 | 4206 | 3570 |
| 3.000.000.000 | 14317 | 11784 | 10047 |

The sample values are the best results out of 10 subsequent tries (minimum)

## Latency benchmark

`GET /recursive/{n}?url={baseUrl}` - calculates the n-th number in the Fibonacci sequence. Sample result: `{"n":"3000000000","prime":3000000019,"msTime":11784}`

The latency benchmark uses a very ineffective algorithm for Fibonacci sequence that calls the same service with the values `n-1` and `n-2` and returns the sum of them. The number of recursive calls grows exponentially wuth the length of the sequence. Optionally you can pass a `url` query parameter that will be used for recursive calls, like `baseUrl/recursive/{n}`. If not provided the `url` used for the initial call will be used.

Sample execution times in milliseconds for different platforms:

| Sequence number | n1-standard machines (Cloud Foundry on GCP) | n2-standard machines (Kubernetes on GCP)  | 2,3 GHz 8-Core Intel Core i9 (MacBook Pro) |
|---|---|---|---|
| 10 | 2333 | 1178 | 1526 |
| 12 | 6947 | 3111 | 4031 |
| 14 | 17282 |  8150 | 11080 |


# Run with docker

```
docker run -p 3000:3000 ghcr.io/pbochynski/cloud-benchmark:0.0.4
```

## Cloud Foundry deployment 

`cf push bench --docker-image pbochynski/cloud-benchmark:0.0.4`


## Kubernetes (Kyma) deployment

```
kubectl create deployment bench --image ghcr.io/pbochynski/cloud-benchmark:0.0.4
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


