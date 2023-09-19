# cloud-benchmark

The `cloud-benchmark` is a test application for checking the cloud offering performance. When you deploy the application to the target environment you can test:
- CPU speed
- network latency
- filesystem throughput

# Quick start

## Run locally with docker
```
docker run -p 3000:3000 ghcr.io/pbochynski/cloud-benchmark:0.0.5
```

## Deploy to Cloud Foundry

```
cf push bench --docker-image pbochynski/cloud-benchmark:0.0.5
```


## Deploy to Kubernetes (Kyma)

Create a test namespace with Istio sidecar injection enabled, and deploy the cloud-benchmark application:

```
kubectl create ns test
kubectl label ns test istio-injection=enabled
kubectl apply -n test -f https://raw.githubusercontent.com/pbochynski/cloud-benchmark/main/cloud-benchmark-k8s.yaml
```

### Deploy Rook operator for Ceph FS for filesystem benchmark

Install Rook operator:
```
kubectl apply -f ceph/crds.yaml -f ceph/common.yaml -f ceph/operator.yaml
```

Production cluster (3 nodes):
```
kubectl apply -f ceph/cluster-on-pvc.yaml
```

Create filesystem and storage class:
```
kubectl apply -f ceph/filesystem.yaml -f ceph/storageclass.yaml
```

Deploy cloud-benchmark app:
```
kubectl apply -f ceph/bench-fs.yaml
```

Open port to benchmark service:
```
kubectl port-forward services/bench 3000:3000
```
Now you can connect to the benchmark app:
[http://localhost:3000](http://localhost:3000)

### AWS EFS 
1. Create Gardener cluster in AWS region
2. Create Filesystem in the same region in AWS Console.
   - pick shoot VPC (the one created by Gardener)
   - go to Network section of new filesystem and wait until mount target state become Available and enter edit mode. Add shoot cluster security group and Save
3. Install EFS CSI driver:
   ```
   kubectl apply -k "github.com/kubernetes-sigs/aws-efs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.5"
   ```
4. Create storage class for EFS:
   ```
   kubectl apply -f efs/storageclass.yaml
   ```
5. Edit `pv.yaml` and replace `volumeHandle` with the filesystem id. Create persistent volume and persistent volume claim:
   ```
   kubectl apply -f efs/pv.yaml
   ```
6. Deploy benchmark application:
   ```
   kubectl apply -f efs/bench-fs.yaml
   ```
7. Port forward benchmark application to localhost:3000
   ```
   kubectl port-forward services/bench 3000:3000
   ```
   and connect to the benchmark app: [http://localhost:3000](http://localhost:3000)


# Benchmarks

## CPU

`GET /prime/{n}` - calculates the smallest prime number bigger or equal to n. Sample result: `{"n":"24", "prime":29, "msTime":1}`

The CPU benchmark is based on prime number calculation. The algorithm starts from the number provided in the request and checks if it is the prime number by dividing it by all the numbers from 2 to n/2 and checking the remainder left. If the remainder left is 0 then it means it is not a prime number, and the next number is evaluated. 

Sample execution times in milliseconds for different platforms:

| Initial number | n1-standard machines (Cloud Foundry on GCP) | n2-standard machines (Kubernetes on GCP)  | 2,3 GHz 8-Core Intel Core i9 (MacBook Pro) |
|---|---|---|---|
| 2.000.000.000 | 5113 | 4206 | 3570 |
| 3.000.000.000 | 14317 | 11784 | 10047 |

The sample values are the best results out of 10 subsequent tries (minimum)

## Latency

`GET /recursive/{n}?url={baseUrl}` - calculates the n-th number in the Fibonacci sequence. Sample result: `{"n":"3000000000","prime":3000000019,"msTime":11784}`

The latency benchmark uses a very ineffective algorithm for Fibonacci sequence that calls the same service with the values `n-1` and `n-2` and returns the sum of them. The number of recursive calls grows exponentially wuth the length of the sequence. Optionally you can pass a `url` query parameter that will be used for recursive calls, like `baseUrl/recursive/{n}`. If not provided the `url` used for the initial call will be used.

Sample execution times in milliseconds for different platforms:

| Sequence number | Cloud Foundry | K8S (ingress gateway)  | K8S (cluster local) | Docker (localhost) |
|---|---|---|---|---|
| 10 | 2333 | 1178 | 217 | 100 |
| 12 | 6947 | 3111 | 607 | 240 |
| 14 | 15074 |  8150 | 1657 | 522 |

The latency is calculated on the server side, to not influence the results with the distance between the client and the application. 


## Filesystem check

