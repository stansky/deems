import type { StickyNote } from "./interview-notes";
import type { InterviewTopic } from "./interview-topics";
import type { InterviewGuide } from "./interview-guides";

export const systemDesignNotes: StickyNote[] = [
  {
    "number": 1,
    "title": "Interview game plan",
    "size": 104,
    "text": "**60-minute game plan**\n0-5: users, goals, scope\n5-10: scale + success targets\n10-20: API + data + basic flow\n20-40: deepest bottleneck\n40-50: failures + tradeoffs\n50-60: recap + questions\n\nAdjust to interviewer cues.\nTrace one read and one write.\nStart simple. Add a component\nonly to solve a named problem.",
    "opens": {
      "kind": "topic",
      "id": "sd-game-plan"
    }
  },
  {
    "number": 2,
    "title": "Ask before drawing",
    "size": 104,
    "text": "**What are we building?**\nWho uses it? Top 2 actions?\nWhat is out of scope?\nHow many users and requests?\nRead-heavy or write-heavy?\nHow fast must it feel?\nCan data be briefly stale?\nWhat must never be lost?\nAny region / privacy limits?\n\nState assumptions out loud.\nGet agreement, then draw.",
    "opens": {
      "kind": "topic",
      "id": "sd-requirements"
    }
  },
  {
    "number": 3,
    "title": "Estimate the load",
    "size": 104,
    "text": "**Rough numbers, clear units**\nQPS = requests / seconds\n1 day = 86,400 seconds\nExample: 10M requests/day\n  = about 116 average QPS\nAssume 10x peak: 1,160 QPS\n\nStorage/day = writes x bytes\n1M writes x 1 KB = 1 GB/day\nThen add retention, indexes,\nreplicas and headroom.\n\nUse estimates to pick a design,\nnot to pretend precision.",
    "opens": {
      "kind": "topic",
      "id": "sd-estimates"
    }
  },
  {
    "number": 4,
    "title": "Draw the first version",
    "size": 104,
    "text": "**Small working design**\nClient -> load balancer\n  -> stateless API -> database\n\nLarge files? Object storage.\nPopular static files? CDN.\nSlow optional work? Queue.\nRepeated hot reads? Cache.\n\nTrace: request, auth, read or\nwrite, response, errors.\nName the source of truth.\nAvoid services without a job.",
    "opens": {
      "kind": "topic",
      "id": "sd-architecture"
    }
  },
  {
    "number": 5,
    "title": "API and data model",
    "size": 104,
    "text": "**Define the contract**\nName entities + IDs + owners.\nShow 2-3 key API calls.\nList required fields + errors.\nUse a cursor for long lists.\n\nModel the main access pattern.\nIndex the WHERE / JOIN / ORDER.\nTransactions for changes that\nmust succeed or fail together.\n\nRetries of a create operation?\nUse an idempotency key.\nCheck ownership on each request.",
    "opens": {
      "kind": "topic",
      "id": "sd-api-data"
    }
  },
  {
    "number": 6,
    "title": "Choose storage",
    "size": 104,
    "text": "**Pick by access pattern**\nRelations + transactions? SQL.\nKey lookup at huge scale?\n  Consider key-value storage.\nText relevance? Search index.\nImages / video? Object storage.\n\nSQL can scale. NoSQL is not\na substitute for requirements.\n\nReplica: copy for reads/failover.\nShard: split data across nodes.\nChoose a key that spreads load.\nName hot-key and cross-shard costs.",
    "opens": {
      "kind": "topic",
      "id": "sd-storage"
    }
  },
  {
    "number": 7,
    "title": "Cache without surprises",
    "size": 104,
    "text": "**Cache repeated reads**\nRead: cache -> miss -> database\n  -> fill cache -> response\nTTL = when cached data expires.\n\nWhat can be stale, and how long?\nOn write: update or invalidate.\nAvoid many misses at once:\n  coalesce requests, jitter TTL.\n\nIf cache fails, protect the DB.\nA cache is not the durable store.\nTrack hit rate + stale results.",
    "opens": {
      "kind": "topic",
      "id": "sd-cache"
    }
  },
  {
    "number": 8,
    "title": "Queues and workers",
    "size": 104,
    "text": "**Move slow work off the request**\nAPI -> durable job -> workers\nReturn a job ID; expose status.\n\nExpect duplicate deliveries.\nMake processing idempotent.\nAck after durable success.\nBound retries; park poison jobs.\n\nWatch queue age, not just size.\nCap work in flight.\nNeed ordered work? Pick the key.\nDB write + publish must agree?\nConsider a transactional outbox.",
    "opens": {
      "kind": "topic",
      "id": "sd-queues"
    }
  },
  {
    "number": 9,
    "title": "Failure and consistency",
    "size": 104,
    "text": "**What breaks? What happens?**\nTimeout every remote call.\nRetry only safe transient errors.\nBound attempts + total time.\nBackoff + jitter spread retries.\nOverloaded? Shed optional work.\n\nReplicas can lag. Ask which\nreads must see the latest write.\nPartition: some requests may\nfail or observe stale data.\n\nBackups need restore tests.\nState data-loss + recovery goals.",
    "opens": {
      "kind": "topic",
      "id": "sd-reliability"
    }
  },
  {
    "number": 10,
    "title": "Explain the tradeoff",
    "size": 104,
    "text": "**Make the decision explicit**\nI choose X because we need Y.\nThe cost is Z. At limit L,\nI would change to W.\n\nCover: latency, availability,\ncorrectness, cost, complexity.\n\nMeasure p95/p99 latency, errors,\ntraffic and resource saturation.\nProtect data; rate-limit abuse.\n\nPractice: URL shortener, feed,\nchat, file upload, job runner.\nFor each: one failure + one fix.",
    "opens": {
      "kind": "topic",
      "id": "sd-tradeoffs"
    }
  }
];
export const systemDesignTopics: InterviewTopic[] = [
  {
    "id": "sd-game-plan",
    "title": "Interview game plan",
    "guide": "system-design",
    "keywords": "**60-minute game plan**\n0-5: users, goals, scope\n5-10: scale + success targets\n10-20: API + data + basic flow\n20-40: deepest bottleneck\n40-50: failures + tradeoffs\n50-60: recap + questions\n\nAdjust to interviewer cues.\nTrace one read and one write.\nStart simple. Add a component\nonly to solve a named problem.",
    "summary": "Keep the conversation moving from user needs to a working design, then explore the most important risk.",
    "useWhen": [
      "Design a URL shortener. Explain your first version in five minutes."
    ],
    "code": [],
    "tips": [
      "Start with two user actions and an explicit scope. Ask whether the interviewer wants a particular deep dive.",
      "For a URL shortener: create a short link and redirect visitors. Analytics can be asynchronous.",
      "Trace one create request and one redirect before adding caches or queues."
    ],
    "watchOut": [
      "Do not spend half the interview listing technologies.",
      "Leave time to explain failure behavior and summarize your choices."
    ],
    "say": "I choose this approach to meet the requirement, and this is the tradeoff."
  },
  {
    "id": "sd-requirements",
    "title": "Ask before drawing",
    "guide": "system-design",
    "keywords": "**What are we building?**\nWho uses it? Top 2 actions?\nWhat is out of scope?\nHow many users and requests?\nRead-heavy or write-heavy?\nHow fast must it feel?\nCan data be briefly stale?\nWhat must never be lost?\nAny region / privacy limits?\n\nState assumptions out loud.\nGet agreement, then draw.",
    "summary": "Turn a broad product name into a small list of behaviors and measurable goals.",
    "useWhen": [
      "Ask five scoping questions for a chat system, then choose two essential features."
    ],
    "code": [],
    "tips": [
      "Functional means what users do. Nonfunctional means how well it must work: response time, uptime, privacy and durability.",
      "For chat: one-to-one or groups? Online only or offline delivery? Are attachments and read receipts required?",
      "Ask which matters most: accepting writes during an outage, immediate agreement between readers, or low latency. Make the choice per operation."
    ],
    "watchOut": [
      "A target such as 200 ms must say which operation and percentile.",
      "State assumed traffic and retention as assumptions, not measured facts."
    ],
    "say": "I choose this approach to meet the requirement, and this is the tradeoff."
  },
  {
    "id": "sd-estimates",
    "title": "Estimate the load",
    "guide": "system-design",
    "keywords": "**Rough numbers, clear units**\nQPS = requests / seconds\n1 day = 86,400 seconds\nExample: 10M requests/day\n  = about 116 average QPS\nAssume 10x peak: 1,160 QPS\n\nStorage/day = writes x bytes\n1M writes x 1 KB = 1 GB/day\nThen add retention, indexes,\nreplicas and headroom.\n\nUse estimates to pick a design,\nnot to pretend precision.",
    "summary": "Use rough arithmetic to locate the expensive part of a design. Keep units visible.",
    "useWhen": [
      "Estimate storage for 100,000 daily uploads averaging 2 MB, retained for 30 days."
    ],
    "code": [],
    "tips": [
      "10 million requests per day / 86,400 is about 116 requests per second on average. A 10x peak assumption gives about 1,160 QPS.",
      "One million writes per day at 1 KB each is about 1 GB per day in decimal units. Thirty days is about 30 GB before indexes, replicas and backups.",
      "Separate reads from writes. Estimate peak throughput, retained bytes and bandwidth only where they change the architecture."
    ],
    "watchOut": [
      "An average hides bursts; ask about peak shape.",
      "Replication multiplies storage. Indexes, metadata and backups add more."
    ],
    "say": "I choose this approach to meet the requirement, and this is the tradeoff."
  },
  {
    "id": "sd-architecture",
    "title": "Draw the first version",
    "guide": "system-design",
    "keywords": "**Small working design**\nClient -> load balancer\n  -> stateless API -> database\n\nLarge files? Object storage.\nPopular static files? CDN.\nSlow optional work? Queue.\nRepeated hot reads? Cache.\n\nTrace: request, auth, read or\nwrite, response, errors.\nName the source of truth.\nAvoid services without a job.",
    "summary": "Start with the smallest design that meets the requirements. Give every component a job.",
    "useWhen": [
      "Trace an upload from permission check to a safe downloadable file."
    ],
    "code": [],
    "tips": [
      "Client -> load balancer -> stateless API -> database is a useful starting point, not a universal template.",
      "For uploads, the API can authorize a short-lived signed object-storage URL. A worker scans the uploaded object before it becomes visible.",
      "Add a CDN for reusable content near users, a queue for slow work, and a cache for repeated reads only when the workload justifies them."
    ],
    "watchOut": [
      "A queue changes completion semantics: accepted does not mean finished.",
      "Do not put large file bytes in every application-server request if direct upload fits the requirements."
    ],
    "say": "I choose this approach to meet the requirement, and this is the tradeoff."
  },
  {
    "id": "sd-api-data",
    "title": "API and data model",
    "guide": "system-design",
    "keywords": "**Define the contract**\nName entities + IDs + owners.\nShow 2-3 key API calls.\nList required fields + errors.\nUse a cursor for long lists.\n\nModel the main access pattern.\nIndex the WHERE / JOIN / ORDER.\nTransactions for changes that\nmust succeed or fail together.\n\nRetries of a create operation?\nUse an idempotency key.\nCheck ownership on each request.",
    "summary": "Specify who owns the data, what callers send, and what success or failure means.",
    "useWhen": [
      "Define two API calls and a data model for a notification service."
    ],
    "code": [],
    "tips": [
      "For a job service: POST /jobs returns a job ID; GET /jobs/{id} returns queued, running, succeeded or failed. Authorize both calls.",
      "Model jobs with id, ownerId, status, createdAt and resultLocation. Index ownerId plus createdAt for a user job list.",
      "For retried creation, store a scoped idempotency key and request fingerprint with the result. Enforce uniqueness atomically; reject reuse with a different payload."
    ],
    "watchOut": [
      "A guessed record ID must never bypass an ownership check.",
      "Writing a row and publishing a message separately can lose work. An outbox keeps the row and event in one transaction."
    ],
    "say": "I choose this approach to meet the requirement, and this is the tradeoff."
  },
  {
    "id": "sd-storage",
    "title": "Choose storage",
    "guide": "system-design",
    "keywords": "**Pick by access pattern**\nRelations + transactions? SQL.\nKey lookup at huge scale?\n  Consider key-value storage.\nText relevance? Search index.\nImages / video? Object storage.\n\nSQL can scale. NoSQL is not\na substitute for requirements.\n\nReplica: copy for reads/failover.\nShard: split data across nodes.\nChoose a key that spreads load.\nName hot-key and cross-shard costs.",
    "summary": "Choose storage based on queries, correctness requirements and operational cost.",
    "useWhen": [
      "Choose storage for orders, product search and product photos. Explain each choice."
    ],
    "code": [],
    "tips": [
      "Use a relational database when joins, constraints and transactions fit the workload. Start with indexes and query plans before sharding.",
      "A replica copies data for failover or reads. A shard holds a subset of data. They solve different problems.",
      "A tenant ID can be a shard key, but one giant tenant may become a hot shard. Discuss skew, cross-shard queries and rebalancing."
    ],
    "watchOut": [
      "A search index is usually derived from another durable source and may lag.",
      "NoSQL does not automatically mean faster, cheaper or more scalable for every query."
    ],
    "say": "I choose this approach to meet the requirement, and this is the tradeoff."
  },
  {
    "id": "sd-cache",
    "title": "Cache without surprises",
    "guide": "system-design",
    "keywords": "**Cache repeated reads**\nRead: cache -> miss -> database\n  -> fill cache -> response\nTTL = when cached data expires.\n\nWhat can be stale, and how long?\nOn write: update or invalidate.\nAvoid many misses at once:\n  coalesce requests, jitter TTL.\n\nIf cache fails, protect the DB.\nA cache is not the durable store.\nTrack hit rate + stale results.",
    "summary": "A cache trades freshness and operational complexity for faster repeated reads.",
    "useWhen": [
      "A celebrity profile expires from cache. Explain how to avoid thousands of simultaneous database reads."
    ],
    "code": [],
    "tips": [
      "Cache-aside: read cache; on miss, read the database and fill the cache with a bounded TTL. The database remains authoritative.",
      "For a popular profile, decide how long stale data is acceptable. A write can invalidate the entry, but concurrent readers and writers still need a race strategy.",
      "Coalesce simultaneous misses for the same key and spread expirations. Bound fallback traffic so a cache outage does not overwhelm the database."
    ],
    "watchOut": [
      "Never reuse a private response under a key that omits its user or permission scope.",
      "TTL limits staleness but does not guarantee immediate agreement after a write."
    ],
    "say": "I choose this approach to meet the requirement, and this is the tradeoff."
  },
  {
    "id": "sd-queues",
    "title": "Queues and workers",
    "guide": "system-design",
    "keywords": "**Move slow work off the request**\nAPI -> durable job -> workers\nReturn a job ID; expose status.\n\nExpect duplicate deliveries.\nMake processing idempotent.\nAck after durable success.\nBound retries; park poison jobs.\n\nWatch queue age, not just size.\nCap work in flight.\nNeed ordered work? Pick the key.\nDB write + publish must agree?\nConsider a transactional outbox.",
    "summary": "Queues separate accepting work from processing it. Design for duplicates and backlog.",
    "useWhen": [
      "Explain what happens if a worker crashes just before acknowledging a completed job."
    ],
    "code": [],
    "tips": [
      "For a thumbnail service, create a durable job, publish its ID and let workers process it. Show status to the caller.",
      "A worker can crash after saving the result but before acknowledging the message. A repeat delivery should reuse the result rather than repeat a harmful side effect.",
      "Monitor oldest-job age as well as depth. Bound worker concurrency and retries; put repeatedly failing jobs in a dead-letter queue with an inspection and replay plan."
    ],
    "watchOut": [
      "More workers can overload the downstream service. A concurrency limit is not the same as requests per second.",
      "Ordering is usually scoped to a key or partition. Global ordering can constrain throughput."
    ],
    "say": "I choose this approach to meet the requirement, and this is the tradeoff."
  },
  {
    "id": "sd-reliability",
    "title": "Failure and consistency",
    "guide": "system-design",
    "keywords": "**What breaks? What happens?**\nTimeout every remote call.\nRetry only safe transient errors.\nBound attempts + total time.\nBackoff + jitter spread retries.\nOverloaded? Shed optional work.\n\nReplicas can lag. Ask which\nreads must see the latest write.\nPartition: some requests may\nfail or observe stale data.\n\nBackups need restore tests.\nState data-loss + recovery goals.",
    "summary": "Explain how the system behaves when calls are slow, nodes fail or replicas disagree.",
    "useWhen": [
      "A payment request times out after the server may have accepted it. Explain a safe client retry."
    ],
    "code": [],
    "tips": [
      "Set connection and request timeouts within an end-to-end deadline. Retry selected transient failures only when the operation is safe to repeat.",
      "Bound retries, use exponential backoff with jitter and avoid retries at every layer. A timeout does not prove the original write failed.",
      "A replica may serve an older value. For a read immediately after a critical write, discuss reading from the primary or another explicit consistency mechanism.",
      "Define RPO as acceptable data loss and RTO as acceptable recovery time. Back up and test restoration; replication alone does not protect against every accidental deletion."
    ],
    "watchOut": [
      "During a network partition, a system cannot guarantee both linearizable responses and availability for every request. Explain the actual user-visible choice.",
      "A failover plan needs detection, fencing and recovery, not just a second server in a diagram."
    ],
    "say": "I choose this approach to meet the requirement, and this is the tradeoff."
  },
  {
    "id": "sd-tradeoffs",
    "title": "Explain the tradeoff",
    "guide": "system-design",
    "keywords": "**Make the decision explicit**\nI choose X because we need Y.\nThe cost is Z. At limit L,\nI would change to W.\n\nCover: latency, availability,\ncorrectness, cost, complexity.\n\nMeasure p95/p99 latency, errors,\ntraffic and resource saturation.\nProtect data; rate-limit abuse.\n\nPractice: URL shortener, feed,\nchat, file upload, job runner.\nFor each: one failure + one fix.",
    "summary": "Connect each design choice to a requirement, name its cost and explain when you would change it.",
    "useWhen": [
      "Practice a URL shortener, chat, feed, file upload and job runner. For each, name a failure, mitigation and tradeoff."
    ],
    "code": [],
    "tips": [
      "Say: I choose a queue because image processing is slow; users get a job ID immediately, but completion becomes asynchronous.",
      "Track tail latency, error rate, throughput, resource saturation and queue age. Use logs and traces to follow a request across components.",
      "Walk a concrete example: a URL shortener stores code -> destination durably, caches popular redirects, and records optional analytics asynchronously. Discuss abuse checks and expired links."
    ],
    "watchOut": [
      "Do not claim exactly-once side effects merely because a broker has a delivery feature. Define the boundary and deduplication behavior.",
      "Avoid adding a distributed component without explaining the bottleneck it solves and its failure cost."
    ],
    "say": "I choose this approach to meet the requirement, and this is the tradeoff."
  }
];
export const systemDesignGuides: InterviewGuide[] = [{
  "id": "system-design",
  "title": "System design interview",
  "summary": "Ten notes with worked scenarios, decisions and practice prompts. Start with the game plan, then follow a request through your design.",
  "topics": [
    "sd-game-plan",
    "sd-requirements",
    "sd-estimates",
    "sd-architecture",
    "sd-api-data",
    "sd-storage",
    "sd-cache",
    "sd-queues",
    "sd-reliability",
    "sd-tradeoffs"
  ],
  "sections": [
    {
      "kind": "points",
      "title": "A 60-minute practice session",
      "items": [
        "5 minutes: clarify users, core actions and scope.",
        "5 minutes: estimate load and agree on targets.",
        "10 minutes: APIs, data model and the basic read/write flow.",
        "20 minutes: explore the main bottleneck.",
        "10 minutes: failures, safety and tradeoffs.",
        "10 minutes: recap and follow-up questions. Adjust to the interviewer."
      ]
    },
    {
      "kind": "table",
      "title": "Need → approach → cost",
      "headers": [
        "Need",
        "Approach",
        "Cost to explain"
      ],
      "code": [
        false,
        false,
        false
      ],
      "rows": [
        [
          "Repeated reads",
          "Cache",
          "Staleness and invalidation"
        ],
        [
          "Slow background work",
          "Queue and workers",
          "Delayed completion and duplicates"
        ],
        [
          "More read capacity",
          "Read replicas",
          "Replication lag"
        ],
        [
          "More write/storage capacity",
          "Partition data",
          "Hot keys and cross-shard work"
        ],
        [
          "Changes that must agree",
          "Transaction",
          "Contention and coordination"
        ],
        [
          "Safe retries",
          "Idempotency key",
          "Durable deduplication and retention"
        ]
      ]
    }
  ]
}];
export const systemDesignCheatSheet = { title: "System design cheat sheet", summary: "Choose a tool for a reason. Explain the cost and failure behavior.", sections: systemDesignGuides[0].sections };
