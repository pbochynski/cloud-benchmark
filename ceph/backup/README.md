# This document will describe how to install velero in a kyma cluster to backup ceph volumes to AWS S3 (or BTP Object Storage)

create or have an S3 Buck


create a credentials file:
```
cat > credentials-velero <<EOF
[default]
aws_access_key_id=<AWS_ACCESS_KEY_ID>
aws_secret_access_key=<AWS_SECRET_ACCESS_KEY>
EOF
```

Install Velero in the cluster
```
BUCKET=<YOUR_BUCKET>
REGION=<YOUR_REGION>
velero install \
    --provider aws \
    --features=EnableCSI \
    --use-node-agent \
    --plugins velero/velero-plugin-for-aws:v1.7.1,velero/velero-plugin-for-csi:v0.3.0 \
    --bucket $BUCKET \
    --backup-location-config region=$REGION \
    --snapshot-location-config region=$REGION \
    --secret-file ./credentials-velero
```

Example IAM Policy for S3 Storage Account: 
```
cat > velero-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeVolumes",
                "ec2:DescribeSnapshots",
                "ec2:CreateTags",
                "ec2:CreateVolume",
                "ec2:CreateSnapshot",
                "ec2:DeleteSnapshot"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObject",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": [
                "arn:aws:s3:::${BUCKET}/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${BUCKET}"
            ]
        }
    ]
}
EOF
```

# create a filesystem backup

- Add an annotation to the pods which you want to backup and from which you want to backup the persistent volumes:
```
kubectl -n <NAMESPACE> annotate pod/<YOUR_POD_NAME> backup.velero.io/backup-volumes=<YOUR_VOLUME_NAME_1>,<YOUR_VOLUME_NAME_2>
```
- Run the Backup:
```
velero backup create <BACKUP-NAME> --include-namespaces <NAMESPACE> --csi-snapshot-timeout=20m
```
- check the backup status like this:
```
velero backup describe <BACKUP-NAME>
velero backup logs <BACKUP-NAME>
```
- once the Backup is completed, we can restore it to a different namespace:
```
velero restore create <RESTORE-NAME> --from-backup <BACKUP-NAME> --namespace-mappings <backed-up-namespace>:<restore-target-namespace>
```
- and check the restore status like this:
```
velero restore describe <RESTORE-NAME>
velero restore logs <RESTORE-NAME>
```

