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
   kubectl apply -k "github.com/kubernetes-sigs/aws-efs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.7"
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
   kubectl apply -f efs/bench-efs.yaml
   ```
7. Port forward benchmark application to localhost:3000
   ```
   kubectl port-forward services/bench-efs 3000:3000
   ```
   and connect to the benchmark app: [http://localhost:3000](http://localhost:3000)

### CSI driver NFS 

1. Create Gardener cluster in GCP region
2. Install CSI NFS driver:
   ```
   kubectl apply -f nfs/rbac-csi-nfs.yaml
   kubectl apply -f nfs/csi-nfs-driverinfo.yaml
   kubectl apply -f nfs/csi-nfs-controller.yaml
   kubectl apply -f nfs/csi-nfs-node.yaml
   ```
3. Create Filestore instance in [console.cloud.google.com](https://console.cloud.google.com)
4. Edit [nfs/storageclass.yaml](nfs/storageclass.yaml) and [nfs/pvc.yaml](nfs/pvc.yaml) and paste NFS server IP and share name
5. Deploy PVC and application:
   ```
   kubectl apply -f nfs/storageclass.yaml
   kubectl apply -f nfs/pvc.yaml
   kubectl apply -f nfs/bench-nfs.yaml
   ```
6. Port forward benchmark application to localhost:3000
   ```
   kubectl port-forward services/bench-efs 3000:3000
   ```
   and connect to the benchmark app: [http://localhost:3000](http://localhost:3000)

### Openstack Manila (Converged Cloud)

1. Create Gardener Cluster in CC Region. Ensure to set in your shoot: InfrastructureConfig.networks.shareNetwork.enabled=True and ControlPlaneConfig.storage.csiManila.enabled=True.
2. Deploy PVC and application:
   ```
   kubectl apply -f os-manila/pvc.yaml
   kubectl apply -f os-manila/bench-os-manila.yaml
   ```
6. Port forward benchmark application to localhost:3000
   ```
   kubectl port-forward services/bench-os-manila 3000:3000
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

`GET /generate-files?prefix=a&n=3000&size=20000&deleteFirst=false"` - generates 3000 files with random content. The files are located in `output` folder and named `{prefix}_{number}.txt`. With the `deleteFirst` flag enabled the generator tries to delete the file first before it writes to it.


The test script for small files:
```
curl "http://localhost:3000/generate-files?prefix=s&n=3000&size=20000"
curl "http://localhost:3000/generate-files?prefix=s&n=3000&size=20000"
curl "http://localhost:3000/generate-files?prefix=s&n=3000&size=20000&deleteFirst=true"
```

The test script for medium files:
```
curl "http://localhost:3000/generate-files?prefix=m&n=300&size=2000000"
curl "http://localhost:3000/generate-files?prefix=m&n=300&size=2000000"
curl "http://localhost:3000/generate-files?prefix=m&n=300&size=2000000&deleteFirst=true"
```

The test script for large files:
```
curl "http://localhost:3000/generate-files?prefix=l&n=6&size=100000000"
curl "http://localhost:3000/generate-files?prefix=l&n=6&size=100000000"
curl "http://localhost:3000/generate-files?prefix=l&n=6&size=100000000&deleteFirst=true"
```

### Sample results for Ceph FS and EFS storage

| Test | Cephs FS | EFS | NFS (Filestore HDD) | NFS (Filestore SSD) | Azure Files | OS Manila |
|------|----------|-----|---------------------|---------------------|-------------|-----------|
|3000 small files (20KB) - new file | 4s | 22s | 12s | 10s | 244s | 3s | 
|3000 small files (20KB) - overwrite existing | 37s | 41s | 15s | 12s | 233s | 4s | 
|3000 small files (20KB) - delete and create new file | 7s | 36s | 24s | 17s | 304s | 5s | 
|300 medium files (2MB) - new file | 24s | 27s | 34s | 35s | 60 s | 24s | 
|300 medium files (2MB) - overwrite existing | 27s | 30s | 37s | 35s | 62s | 27s | 
|300 medium files (2MB) - delete and create new file | 24s | 27s | 38s | 36s | 60s | 26s | 
|6 large files (100MB) - new file | 24s | 24s | 34s | 34s | 31s | 21s | 
|6 large files (100MB) - overwrite existing | 24s | 24s  | 34s | 34s | 31s | 21,2s | 
|6 large files (100MB) - delete and create new file | 24s | 25s | 34s | 34s | 35s | 22s | 

