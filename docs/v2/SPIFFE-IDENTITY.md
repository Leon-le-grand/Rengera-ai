# Zero-Trust SPIFFE Workload Identity

Every deployment revision receives an ephemeral X.509 SVID scoped to its `spiffe://rengera.internal/ns/<env>/sa/<service>` identity with a 15-minute TTL and automatic mTLS rotation across regional edge proxies.
