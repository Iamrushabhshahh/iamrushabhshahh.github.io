# Posts tagged "aws"

- [A hostname that never existed took Redis and Postgres down with it](https://rushabhshah.dev/blog/dns-storm-eai-again/) (2026-09-29): A logging misconfiguration pointed two dozen services at a DNS name nobody ever created. They retried it 46 times a second, burnt 28% of the AWS per-ENI resolver budget, and starved DNS for two services that had never touched Elasticsearch. A postmortem of getaddrinfo EAI_AGAIN.
