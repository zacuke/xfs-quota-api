# xfs_quota_api
A simple example for managing XFS quotas on a per directory basis.

This is meant to be used against an XFS volume mounted at $MOUNT_POINT - make sure it is mounted with pquota flag. 

The mount point needs to the root of the mounted XFS partition, and customer folders are created at the first depth level.

# Usage 
Change LISTEN_IP=0.0.0.0 for external access.
Root is required as it uses `xfs_quota` and modifies files in `/etc`.

```
pnpm install
sudo node index.js
```
 
When you add a customer, it will create the folder at $MOUNT_POINT/customer and setup a default 50M quota which can be increased later by calling the set quota method.

A report is also available to show current usage.

# Add a customer:
curl -X POST http://localhost:2900/customers?secret=YOUR_SECRET_KEY \
  -H "Content-Type: application/json" \
  -d '{"customer": "cust3"}'

# Set quota:
curl -X POST http://localhost:2900/customers/cust3/quota?secret=YOUR_SECRET_KEY \
  -H "Content-Type: application/json" \
  -d '{"size": "100M"}'

# Get report:
curl http://localhost:2900/report?secret=YOUR_SECRET_KEY


