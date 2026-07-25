'use strict';

/* =========================================================
   INTERVIEW NOTES — APPLICATION LOGIC
   Organised into small namespaced objects:
   utils, storage, state, notes, markdown, ui, events, app
========================================================= */

/* ---------------------------------------------------------
   UTILS
--------------------------------------------------------- */
const utils = {
  generateId() {
    // Timestamp + random tail keeps ids unique even when two people
    // add a note at the same moment from different browsers.
    return Date.now() * 1000 + Math.floor(Math.random() * 1000);
  },

  escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  debounce(fn, delay = 200) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  nowIso() {
    return new Date().toISOString();
  },

  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  },
};

/* ---------------------------------------------------------
   LIGHTWEIGHT MARKDOWN PARSER
   Supports: # ## ### headings, **bold**, *italic*, `code`,
   ```lang code blocks```, - / * bullet lists, blank-line
   paragraphs. Output is escaped first, so it is XSS-safe.
--------------------------------------------------------- */
const markdown = {
  render(raw = '') {
    if (!raw) return '';

    // 1. Extract fenced code blocks first so their contents are
    //    never touched by inline/paragraph rules.
    const blocks = [];
    let text = raw.replace(/```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
      const idx = blocks.length;
      blocks.push({ lang: lang.trim(), code });
      return `\u0000CODEBLOCK${idx}\u0000`;
    });

    text = utils.escapeHtml(text);

    const lines = text.split('\n');
    const html = [];
    let listOpen = false;

    const closeList = () => {
      if (listOpen) { html.push('</ul>'); listOpen = false; }
    };

    lines.forEach(line => {
      const placeholderMatch = line.match(/\u0000CODEBLOCK(\d+)\u0000/);
      if (placeholderMatch) {
        closeList();
        const block = blocks[Number(placeholderMatch[1])];
        const langClass = block.lang ? ` class="lang-${utils.escapeHtml(block.lang)}"` : '';
        html.push(`<pre><code${langClass}>${utils.escapeHtml(block.code.replace(/\n$/, ''))}</code></pre>`);
        return;
      }

      const heading = line.match(/^(#{1,3})\s+(.*)$/);
      if (heading) {
        closeList();
        const level = heading[1].length;
        html.push(`<h${level}>${markdown.inline(heading[2])}</h${level}>`);
        return;
      }

      const bullet = line.match(/^\s*[-*]\s+(.*)$/);
      if (bullet) {
        if (!listOpen) { html.push('<ul>'); listOpen = true; }
        html.push(`<li>${markdown.inline(bullet[1])}</li>`);
        return;
      }

      closeList();
      if (line.trim() === '') return;
      html.push(`<p>${markdown.inline(line)}</p>`);
    });

    closeList();
    return html.join('');
  },

  inline(str) {
    return str
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  },
};

/* ---------------------------------------------------------
   DEFAULT SEED NOTES
   Loaded only the first time the app runs (empty localStorage).
--------------------------------------------------------- */
const defaultNotes = [
  {
    id: 1, category: 'Java',
    questions: ['What is the difference between JDK, JRE and JVM?', 'Explain JVM vs JRE vs JDK.'],
    answer: `- **JVM** (Java Virtual Machine) executes bytecode and provides the runtime engine.\n- **JRE** (Java Runtime Environment) bundles the JVM with core libraries needed to *run* Java programs.\n- **JDK** (Java Development Kit) bundles the JRE with compilers and tools needed to *build* Java programs.\n\nIn short: \`JDK ⊃ JRE ⊃ JVM\`.`,
    tags: ['java', 'core', 'fundamentals'], difficulty: 'Easy', favorite: true,
    createdAt: '2026-01-04T09:12:00.000Z', updatedAt: '2026-01-04T09:12:00.000Z',
  },
  {
    id: 2, category: 'Java',
    questions: ['What is the difference between == and .equals() in Java?'],
    answer: `\`==\` compares **references** for objects (or primitive values for primitives). \`.equals()\` compares **logical equality**, and can be overridden.\n\n\`\`\`java\nString a = new String("hi");\nString b = new String("hi");\na == b;        // false, different objects\na.equals(b);   // true, same content\n\`\`\``,
    tags: ['java', 'strings'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-01-05T10:00:00.000Z', updatedAt: '2026-01-05T10:00:00.000Z',
  },
  {
    id: 3, category: 'Collections',
    questions: ['ArrayList vs LinkedList — when would you use each?', 'Compare ArrayList and LinkedList.'],
    answer: `**ArrayList** is backed by a dynamic array: O(1) random access, O(n) insert/remove in the middle.\n\n**LinkedList** is a doubly linked list: O(1) insert/remove at known nodes, O(n) random access.\n\nPrefer ArrayList for frequent reads, LinkedList when you mostly insert/remove at the ends (queue/deque usage).`,
    tags: ['java', 'collections', 'list'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-01-06T11:20:00.000Z', updatedAt: '2026-01-06T11:20:00.000Z',
  },
  {
    id: 4, category: 'Collections',
    questions: ['How does HashMap work internally?', 'Explain HashMap internals in Java 8+.'],
    answer: `A HashMap stores entries in an array of buckets indexed by \`hash(key) % capacity\`.\n\n1. On collision, entries chain in a linked list.\n2. Since **Java 8**, a bucket converts to a red-black tree once it holds more than 8 entries, giving O(log n) worst case instead of O(n).\n3. Resizing doubles capacity when the load factor (default 0.75) is exceeded.`,
    tags: ['java', 'collections', 'hashmap'], difficulty: 'Medium', favorite: true,
    createdAt: '2026-01-06T14:00:00.000Z', updatedAt: '2026-01-20T09:00:00.000Z',
  },
  {
    id: 5, category: 'Exception Handling',
    questions: ['Checked vs unchecked exceptions — what is the difference?'],
    answer: `**Checked exceptions** extend \`Exception\` (excluding \`RuntimeException\`) and must be declared or caught at compile time, e.g. \`IOException\`.\n\n**Unchecked exceptions** extend \`RuntimeException\` and are not enforced by the compiler, e.g. \`NullPointerException\`.\n\nUse checked exceptions for recoverable conditions the caller should plan for; unchecked for programming errors.`,
    tags: ['java', 'exceptions'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-01-07T08:45:00.000Z', updatedAt: '2026-01-07T08:45:00.000Z',
  },
  {
    id: 6, category: 'Exception Handling',
    questions: ['What is the difference between throw and throws?', 'How does try-with-resources work?'],
    answer: `\`throw\` actually raises an exception instance at runtime. \`throws\` is a method signature declaration listing exceptions the method may propagate.\n\n**try-with-resources** auto-closes any resource implementing \`AutoCloseable\` when the block exits, even on exception:\n\n\`\`\`java\ntry (BufferedReader r = new BufferedReader(new FileReader(f))) {\n    return r.readLine();\n}\n\`\`\``,
    tags: ['java', 'exceptions', 'resources'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-08T13:30:00.000Z', updatedAt: '2026-01-08T13:30:00.000Z',
  },
  {
    id: 7, category: 'JVM',
    questions: ['Describe the memory areas of the JVM.', 'What lives on the heap vs the stack?'],
    answer: `- **Heap** — objects and instance data, shared across threads, GC-managed.\n- **Stack** — per-thread; holds frames with local variables and partial results.\n- **Metaspace** (Java 8+) — class metadata, replaced PermGen.\n- **PC Register** — per-thread instruction pointer.\n- **Native method stacks** — for JNI code.`,
    tags: ['jvm', 'memory'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-09T09:00:00.000Z', updatedAt: '2026-01-09T09:00:00.000Z',
  },
  {
    id: 8, category: 'Garbage Collection',
    questions: ['What garbage collection algorithms does the JVM offer?', 'Explain Generational GC.'],
    answer: `The heap is split into **Young Gen** (Eden + two Survivor spaces) and **Old Gen**. Most objects die young, so minor GCs on Young Gen are frequent and cheap; major/full GCs on Old Gen are rarer and more expensive.\n\nCommon collectors: **Serial**, **Parallel**, **G1** (default, region-based, balances pause time vs throughput), and **ZGC/Shenandoah** for very low pause times on large heaps.`,
    tags: ['jvm', 'gc', 'performance'], difficulty: 'Hard', favorite: false,
    createdAt: '2026-01-10T10:10:00.000Z', updatedAt: '2026-01-10T10:10:00.000Z',
  },
  {
    id: 9, category: 'Multithreading',
    questions: ['What is the difference between synchronized and volatile?', 'When would you use volatile over synchronized?'],
    answer: `\`volatile\` guarantees **visibility** — every thread reads the latest written value — but not atomicity of compound operations.\n\n\`synchronized\` guarantees both **visibility and mutual exclusion**, at the cost of blocking.\n\nUse \`volatile\` for simple flags; use \`synchronized\` (or higher-level \`java.util.concurrent\` tools) when multiple related fields must change atomically.`,
    tags: ['java', 'concurrency'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-11T09:40:00.000Z', updatedAt: '2026-01-11T09:40:00.000Z',
  },
  {
    id: 10, category: 'Multithreading',
    questions: ['Explain the Executor framework.', 'Why avoid creating raw Threads in production code?'],
    answer: `The **Executor framework** decouples task submission from thread management via thread pools.\n\n\`\`\`java\nExecutorService pool = Executors.newFixedThreadPool(4);\npool.submit(() -> process(job));\npool.shutdown();\n\`\`\`\n\nRaw \`new Thread()\` usage is discouraged: no pooling, no backpressure, no lifecycle control, and it's easy to leak threads under load.`,
    tags: ['java', 'concurrency', 'executors'], difficulty: 'Medium', favorite: true,
    createdAt: '2026-01-12T15:00:00.000Z', updatedAt: '2026-01-12T15:00:00.000Z',
  },
  {
    id: 11, category: 'Spring',
    questions: ['What is Dependency Injection and why does Spring use it?', 'Constructor vs setter injection?'],
    answer: `**Dependency Injection (DI)** lets the container supply an object's collaborators instead of the object constructing them itself, which decouples components and simplifies testing.\n\n**Constructor injection** is preferred: it makes dependencies explicit and immutable. **Setter injection** suits optional dependencies that may change after construction.`,
    tags: ['spring', 'di', 'ioc'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-01-13T09:00:00.000Z', updatedAt: '2026-01-13T09:00:00.000Z',
  },
  {
    id: 12, category: 'Spring',
    questions: ['What are Spring bean scopes?'],
    answer: `- **singleton** (default) — one instance per container.\n- **prototype** — new instance every time it's requested.\n- **request / session / application** — web-aware scopes tied to an HTTP request, session, or ServletContext.\n\nChoose \`prototype\` for stateful, non-thread-safe beans; \`singleton\` for stateless services.`,
    tags: ['spring', 'beans'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-01-13T11:00:00.000Z', updatedAt: '2026-01-13T11:00:00.000Z',
  },
  {
    id: 13, category: 'Spring Boot',
    questions: ['How does Spring Boot auto-configuration work?', 'What is @SpringBootApplication doing under the hood?'],
    answer: `\`@SpringBootApplication\` combines \`@Configuration\`, \`@EnableAutoConfiguration\` and \`@ComponentScan\`.\n\n**Auto-configuration** inspects the classpath and existing beans, then conditionally registers beans via \`@Conditional\` variants (e.g. \`@ConditionalOnClass\`, \`@ConditionalOnMissingBean\`) declared in \`spring.factories\` / \`AutoConfiguration.imports\`.`,
    tags: ['spring-boot', 'autoconfig'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-14T10:00:00.000Z', updatedAt: '2026-01-14T10:00:00.000Z',
  },
  {
    id: 14, category: 'Spring Boot',
    questions: ['What is the difference between @Component, @Service and @Repository?'],
    answer: `All three register a class as a Spring bean via component scanning. The distinction is **semantic**:\n\n- \`@Component\` — generic stereotype.\n- \`@Service\` — business/service layer.\n- \`@Repository\` — persistence layer; additionally enables exception translation to \`DataAccessException\`.`,
    tags: ['spring-boot', 'annotations'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-01-14T13:00:00.000Z', updatedAt: '2026-01-14T13:00:00.000Z',
  },
  {
    id: 15, category: 'Spring Security',
    questions: ['How does the Spring Security filter chain work?', 'Explain authentication vs authorization in Spring Security.'],
    answer: `Every request passes through a **chain of servlet filters** (e.g. \`UsernamePasswordAuthenticationFilter\`, \`BasicAuthenticationFilter\`) before reaching the DispatcherServlet.\n\n**Authentication** establishes *who* the caller is (produces an \`Authentication\` object). **Authorization** decides *what* they can do, enforced via \`AccessDecisionManager\` / method security (\`@PreAuthorize\`).`,
    tags: ['spring-security', 'auth'], difficulty: 'Hard', favorite: false,
    createdAt: '2026-01-15T09:30:00.000Z', updatedAt: '2026-01-15T09:30:00.000Z',
  },
  {
    id: 16, category: 'Hibernate',
    questions: ['What is the difference between get() and load() in Hibernate?'],
    answer: `\`session.get()\` hits the database immediately and returns \`null\` if the row is absent.\n\n\`session.load()\` returns a **lazy proxy** without querying the database until a field is accessed, and throws \`ObjectNotFoundException\` if the row is missing.`,
    tags: ['hibernate', 'orm'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-16T09:00:00.000Z', updatedAt: '2026-01-16T09:00:00.000Z',
  },
  {
    id: 17, category: 'Hibernate',
    questions: ['What causes the N+1 select problem and how do you fix it?'],
    answer: `Fetching a parent collection lazily triggers **one query per child access** in addition to the original query — N+1 total.\n\nFixes:\n- Use \`JOIN FETCH\` in JPQL.\n- Use \`@EntityGraph\` to define fetch plans.\n- Enable batch fetching (\`hibernate.default_batch_fetch_size\`).`,
    tags: ['hibernate', 'orm', 'performance'], difficulty: 'Hard', favorite: true,
    createdAt: '2026-01-16T14:00:00.000Z', updatedAt: '2026-01-16T14:00:00.000Z',
  },
  {
    id: 18, category: 'JPA',
    questions: ['What is the difference between JPA and Hibernate?', 'Explain the EntityManager lifecycle.'],
    answer: `**JPA** is a specification (a set of interfaces/annotations). **Hibernate** is the most widely used *implementation* of that specification (others: EclipseLink, OpenJPA).\n\nAn \`EntityManager\` manages a **persistence context** — entities move through *transient → managed → detached → removed* states as it tracks and flushes changes.`,
    tags: ['jpa', 'hibernate', 'orm'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-17T09:00:00.000Z', updatedAt: '2026-01-17T09:00:00.000Z',
  },
  {
    id: 19, category: 'REST',
    questions: ['What makes an API RESTful?', 'PUT vs PATCH vs POST — when to use each?'],
    answer: `REST relies on: **statelessness**, a **uniform interface** (resources identified by URIs, manipulated via standard HTTP verbs), **cacheability**, and a **client-server** separation.\n\n- \`POST\` — create a new resource (non-idempotent).\n- \`PUT\` — replace a resource entirely (idempotent).\n- \`PATCH\` — partially update a resource (not necessarily idempotent).`,
    tags: ['rest', 'http', 'api'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-01-18T09:00:00.000Z', updatedAt: '2026-01-18T09:00:00.000Z',
  },
  {
    id: 20, category: 'Microservices',
    questions: ['How do microservices communicate, and what are the tradeoffs?', 'What is the Circuit Breaker pattern?'],
    answer: `Services talk **synchronously** (REST/gRPC — simple, but couples availability) or **asynchronously** (message queues/event streams — resilient, but adds eventual consistency).\n\nA **Circuit Breaker** (e.g. Resilience4j) stops calling a failing downstream service after a failure threshold, failing fast and allowing recovery instead of cascading timeouts.`,
    tags: ['microservices', 'architecture'], difficulty: 'Hard', favorite: false,
    createdAt: '2026-01-19T09:00:00.000Z', updatedAt: '2026-01-19T09:00:00.000Z',
  },
  {
    id: 21, category: 'Docker',
    questions: ['What is the difference between a Docker image and a container?', 'What does a multi-stage build accomplish?'],
    answer: `An **image** is a read-only, layered template. A **container** is a running (or stopped) instance of an image with its own writable layer.\n\nA **multi-stage build** compiles in one stage with full build tooling, then copies only the built artifact into a slim final stage — shrinking the shipped image:\n\n\`\`\`\nFROM maven:3.9 AS build\nCOPY . .\nRUN mvn package\n\nFROM eclipse-temurin:21-jre\nCOPY --from=build /app/target/app.jar app.jar\n\`\`\``,
    tags: ['docker', 'containers'], difficulty: 'Medium', favorite: true,
    createdAt: '2026-01-20T09:00:00.000Z', updatedAt: '2026-01-20T09:00:00.000Z',
  },
  {
    id: 22, category: 'Kubernetes',
    questions: ['What is the difference between a Deployment and a StatefulSet?', 'What does a Kubernetes Service do?'],
    answer: `A **Deployment** manages interchangeable, stateless Pods with random names/IPs. A **StatefulSet** gives Pods stable identities, ordered startup/shutdown, and stable storage — for databases and other stateful workloads.\n\nA **Service** provides a stable virtual IP/DNS name that load-balances traffic across a set of Pods, decoupling clients from Pod churn.`,
    tags: ['kubernetes', 'orchestration'], difficulty: 'Hard', favorite: false,
    createdAt: '2026-01-21T09:00:00.000Z', updatedAt: '2026-01-21T09:00:00.000Z',
  },
  {
    id: 23, category: 'Kafka',
    questions: ['What is a Kafka partition and why does it matter?', 'How does Kafka guarantee ordering?'],
    answer: `A **topic** is split into **partitions**, each an append-only, ordered log. Partitions allow parallelism — different partitions can be consumed concurrently.\n\nKafka guarantees ordering **only within a partition**, not across the whole topic. Keyed messages with the same key always land on the same partition, preserving per-key order.`,
    tags: ['kafka', 'streaming'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-22T09:00:00.000Z', updatedAt: '2026-01-22T09:00:00.000Z',
  },
  {
    id: 24, category: 'Redis',
    questions: ['What data structures does Redis support?', 'How does Redis achieve persistence?'],
    answer: `Redis supports **strings, lists, sets, sorted sets, hashes, streams, and bitmaps**, all served from memory for very low latency.\n\nPersistence options: **RDB** (periodic point-in-time snapshots) and **AOF** (append-only log of write commands, replayed on restart). Many deployments combine both for durability with fast restarts.`,
    tags: ['redis', 'caching'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-23T09:00:00.000Z', updatedAt: '2026-01-23T09:00:00.000Z',
  },
  {
    id: 25, category: 'SQL',
    questions: ['What is the difference between INNER JOIN and LEFT JOIN?', 'Explain the difference between WHERE and HAVING.'],
    answer: `\`INNER JOIN\` returns only rows with matches in both tables. \`LEFT JOIN\` returns all rows from the left table, with NULLs where no match exists on the right.\n\n\`\`\`sql\nSELECT o.id, c.name\nFROM orders o\nLEFT JOIN customers c ON c.id = o.customer_id;\n\`\`\`\n\n\`WHERE\` filters rows **before** grouping; \`HAVING\` filters groups **after** aggregation.`,
    tags: ['sql', 'joins'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-01-24T09:00:00.000Z', updatedAt: '2026-01-24T09:00:00.000Z',
  },
  {
    id: 26, category: 'Oracle',
    questions: ['What is the difference between VARCHAR2 and CHAR in Oracle?', 'What is a materialized view?'],
    answer: `\`CHAR\` is fixed-length and space-padded; \`VARCHAR2\` is variable-length and stores only the actual characters used, so it's almost always preferred.\n\nA **materialized view** persists the *result* of a query to disk and can be refreshed on a schedule or on commit — trading storage and staleness for much faster reads than a plain view.`,
    tags: ['oracle', 'sql'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-25T09:00:00.000Z', updatedAt: '2026-01-25T09:00:00.000Z',
  },
  {
    id: 27, category: 'PostgreSQL',
    questions: ['What is the difference between a B-tree and a GIN index in PostgreSQL?', 'How does MVCC work in Postgres?'],
    answer: `**B-tree** indexes suit equality/range queries on ordered scalar data (default index type). **GIN** indexes suit composite/multi-valued columns like arrays, JSONB, or full-text search vectors.\n\n**MVCC** (Multi-Version Concurrency Control) lets readers see a consistent snapshot without blocking writers: updates create new row versions instead of overwriting in place, and old versions are later reclaimed by \`VACUUM\`.`,
    tags: ['postgresql', 'indexing'], difficulty: 'Hard', favorite: false,
    createdAt: '2026-01-26T09:00:00.000Z', updatedAt: '2026-01-26T09:00:00.000Z',
  },
  {
    id: 28, category: 'AWS',
    questions: ['What is the difference between an EC2 instance and a Lambda function?', 'S3 storage classes — how do you choose?'],
    answer: `**EC2** gives you a long-running virtual machine you manage and pay for continuously. **Lambda** runs stateless code on demand, scales automatically, and you pay only for invocation time.\n\n**S3 storage classes** trade retrieval speed/cost for storage cost: \`Standard\` for frequently accessed data, \`Infrequent Access\` for occasional reads, and \`Glacier\` variants for long-term archival with retrieval delays.`,
    tags: ['aws', 'cloud'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-27T09:00:00.000Z', updatedAt: '2026-01-27T09:00:00.000Z',
  },
  {
    id: 29, category: 'Git',
    questions: ['What is the difference between git merge and git rebase?', 'What does git cherry-pick do?'],
    answer: `\`git merge\` creates a new merge commit joining two histories, preserving exactly what happened. \`git rebase\` replays your commits on top of another base, producing a **linear** history but rewriting commit hashes.\n\n\`git cherry-pick <hash>\` applies a single existing commit onto the current branch — handy for pulling one fix without merging an entire branch.`,
    tags: ['git', 'version-control'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-01-28T09:00:00.000Z', updatedAt: '2026-01-28T09:00:00.000Z',
  },
  {
    id: 30, category: 'GitHub',
    questions: ['What is the difference between a fork and a branch?', 'What are GitHub Actions?'],
    answer: `A **branch** is a pointer within the same repository, sharing history and access. A **fork** is a full copy of the repository under a different owner, typically used to contribute to a project without write access.\n\n**GitHub Actions** run YAML-defined workflows triggered by repository events (push, PR, schedule) — commonly used for CI/CD.`,
    tags: ['github', 'ci-cd'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-01-29T09:00:00.000Z', updatedAt: '2026-01-29T09:00:00.000Z',
  },
  {
    id: 31, category: 'Jenkins',
    questions: ['What is a Jenkins pipeline and what is the difference between declarative and scripted syntax?'],
    answer: `A **Jenkins pipeline** defines a build/test/deploy process as code, usually in a \`Jenkinsfile\`.\n\n\`\`\`groovy\npipeline {\n  agent any\n  stages {\n    stage('Build') { steps { sh 'mvn package' } }\n  }\n}\n\`\`\`\n\n**Declarative** syntax is structured and easier to read/lint; **scripted** syntax is raw Groovy, offering more flexibility at the cost of readability.`,
    tags: ['jenkins', 'ci-cd'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-30T09:00:00.000Z', updatedAt: '2026-01-30T09:00:00.000Z',
  },
  {
    id: 32, category: 'Maven',
    questions: ['What are Maven build lifecycle phases?', 'What is the difference between compile, provided and runtime scope?'],
    answer: `The default lifecycle runs phases in order: \`validate → compile → test → package → verify → install → deploy\`. Running a phase runs every phase before it.\n\n- \`compile\` scope — needed at both compile and runtime, packaged with the artifact.\n- \`provided\` scope — needed at compile time but supplied by the runtime environment (e.g. a servlet container), not packaged.\n- \`runtime\` scope — needed at runtime only, not for compiling your code.`,
    tags: ['maven', 'build-tools'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-01-31T09:00:00.000Z', updatedAt: '2026-01-31T09:00:00.000Z',
  },
  {
    id: 33, category: 'CI/CD',
    questions: ['What is the difference between continuous delivery and continuous deployment?'],
    answer: `Both automate build/test through to a release-ready artifact.\n\n**Continuous Delivery** stops just short of production — a human approves the final release.\n\n**Continuous Deployment** goes further and pushes every passing change straight to production automatically, with no manual gate.`,
    tags: ['ci-cd', 'devops'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-02-01T09:00:00.000Z', updatedAt: '2026-02-01T09:00:00.000Z',
  },
  {
    id: 34, category: 'Linux',
    questions: ['What is the difference between a hard link and a symbolic link?', 'How would you find which process is using a given port?'],
    answer: `A **hard link** is a second directory entry pointing to the same inode — deleting the original leaves the data intact as long as one link remains. A **symbolic link** is a separate file containing a path reference, which breaks if the target is removed.\n\nTo find what's using a port:\n\n\`\`\`\nsudo lsof -i :8080\n\`\`\``,
    tags: ['linux', 'shell'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-02-02T09:00:00.000Z', updatedAt: '2026-02-02T09:00:00.000Z',
  },
  {
    id: 35, category: 'Design Patterns',
    questions: ['Explain the Singleton pattern and its pitfalls.', 'What is the difference between Factory Method and Abstract Factory?'],
    answer: `**Singleton** ensures a class has exactly one instance with a global access point. Pitfalls: hidden global state, harder unit testing, and thread-safety issues if lazily initialised without care.\n\n**Factory Method** lets a subclass decide which concrete class to instantiate for a single product. **Abstract Factory** produces **families** of related objects without specifying their concrete classes.`,
    tags: ['design-patterns', 'oop'], difficulty: 'Medium', favorite: false,
    createdAt: '2026-02-03T09:00:00.000Z', updatedAt: '2026-02-03T09:00:00.000Z',
  },
  {
    id: 36, category: 'OOP',
    questions: ['What are the four pillars of OOP?', 'What is the difference between overloading and overriding?'],
    answer: `- **Encapsulation** — bundling data with the methods that operate on it, hiding internal state.\n- **Abstraction** — exposing essential behaviour while hiding implementation detail.\n- **Inheritance** — reusing and extending behaviour from a parent type.\n- **Polymorphism** — treating different types through a common interface.\n\n**Overloading** is compile-time: same method name, different parameter list. **Overriding** is runtime: a subclass redefines a parent method with the same signature.`,
    tags: ['oop', 'fundamentals'], difficulty: 'Easy', favorite: false,
    createdAt: '2026-02-04T09:00:00.000Z', updatedAt: '2026-02-04T09:00:00.000Z',
  },
  {
    id: 37, category: 'SOLID',
    questions: ['What does SOLID stand for?', 'Give a practical example of the Open/Closed Principle.'],
    answer: `- **S** — Single Responsibility: a class should have one reason to change.\n- **O** — Open/Closed: open for extension, closed for modification.\n- **L** — Liskov Substitution: subtypes must be usable wherever their base type is expected.\n- **I** — Interface Segregation: prefer many small interfaces over one broad one.\n- **D** — Dependency Inversion: depend on abstractions, not concrete implementations.\n\nExample of Open/Closed: adding a new payment method by implementing a \`PaymentStrategy\` interface, rather than editing an existing \`if/else\` chain.`,
    tags: ['solid', 'oop', 'design-patterns'], difficulty: 'Medium', favorite: true,
    createdAt: '2026-02-05T09:00:00.000Z', updatedAt: '2026-02-05T09:00:00.000Z',
  },
];

/* ---------------------------------------------------------
   GITHUB CONFIG
   ⚠ SECURITY NOTE: the token below ships inside this public
   script.js and is visible to anyone who views the page
   source. Use a FINE-GRAINED personal access token scoped to
   ONLY this one repository, with ONLY "Contents: Read and
   write" permission — nothing else. Never use a classic token
   or an account-wide token here. Treat this repo's data as
   fully public and writable by anyone, since it is.
--------------------------------------------------------- */
const githubConfig = {
  owner: 'PranikNikose',   // e.g. 'pranik'
  repo: 'PranikNikoseWebsite',          // e.g. 'InterviewNotes'
  branch: 'main',
  path: 'nqna/data/notes.json',         // file used as the shared database
  token: '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',      // fine-grained PAT, Contents: Read and write only
};

/* ---------------------------------------------------------
   CLOUD SYNC (GitHub file as the shared database)
   A single JSON file in the repo holds every note. Reads and
   writes go through GitHub's REST Contents API directly from
   the browser. There's no realtime push from GitHub, so we
   poll on an interval to pick up changes made by other
   visitors. Falls back silently to local-only mode if
   githubConfig above isn't filled in.
--------------------------------------------------------- */
const cloud = {
  enabled: false,
  sha: null,
  POLL_MS: 15000, // how often to check GitHub for changes made by others

  init() {
    cloud.enabled = !!(githubConfig.token && !githubConfig.token.startsWith('YOUR_')
      && githubConfig.owner && !githubConfig.owner.startsWith('YOUR_'));
  },

  apiUrl() {
    return `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${githubConfig.path}`;
  },

  headers() {
    return {
      Authorization: `token ${githubConfig.token}`,
      Accept: 'application/vnd.github+json',
    };
  },

  encode(list) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(list, null, 2))));
  },

  decode(base64) {
    return JSON.parse(decodeURIComponent(escape(atob(base64))));
  },

  async fetchList() {
    const res = await fetch(`${cloud.apiUrl()}?ref=${githubConfig.branch}&t=${Date.now()}`, { headers: cloud.headers() });
    if (res.status === 404) return null; // file doesn't exist yet
    if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
    const data = await res.json();
    cloud.sha = data.sha;
    return cloud.decode(data.content);
  },

  async writeList(list) {
    const body = {
      message: `Update notes (${list.length} total) — ${new Date().toISOString()}`,
      content: cloud.encode(list),
      branch: githubConfig.branch,
    };
    if (cloud.sha) body.sha = cloud.sha;

    const res = await fetch(cloud.apiUrl(), {
      method: 'PUT',
      headers: { ...cloud.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      // Someone else wrote in the meantime — refetch the latest sha and retry once.
      await cloud.fetchList();
      return cloud.writeList(list);
    }
    if (!res.ok) throw new Error(`GitHub write failed: ${res.status}`);
    const data = await res.json();
    cloud.sha = data.content.sha;
  },

  async seedIfEmpty(defaults) {
    if (!cloud.enabled) return;
    try {
      const list = await cloud.fetchList();
      if (list === null || list.length === 0) await cloud.writeList(defaults);
    } catch (err) {
      console.error('Seed failed:', err);
    }
  },

  subscribe(onChange) {
    if (!cloud.enabled) return;
    const poll = async () => {
      try {
        const list = await cloud.fetchList();
        if (list !== null) onChange(list);
      } catch (err) {
        console.error('Sync read error:', err);
      }
    };
    poll();
    setInterval(poll, cloud.POLL_MS);
  },

  // Every mutation rewrites the whole shared file — GitHub has no
  // per-record update, so we push the full current note list.
  syncFullList(list) {
    if (!cloud.enabled) return;
    cloud.writeList(list).catch(err => {
      console.error(err);
      ui.toast('✗ Could not sync to GitHub', 'error');
    });
  },
};

/* ---------------------------------------------------------
   STORAGE
--------------------------------------------------------- */
const storage = {
  KEY: 'interviewNotes',

  load() {
    try {
      const raw = localStorage.getItem(storage.KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  save(list) {
    try {
      localStorage.setItem(storage.KEY, JSON.stringify(list));
      return true;
    } catch {
      return false;
    }
  },
};

/* ---------------------------------------------------------
   APPLICATION STATE
--------------------------------------------------------- */
const state = {
  notes: [],
  filters: { search: '', category: 'all', difficulty: 'all', favoritesOnly: false },
  sort: 'newest',
  revisionMode: false,
  expandedAnswers: new Set(),   // noteIds with answer panel open
  revealedInRevision: new Set(), // noteIds revealed while in revision mode
  editingId: null,
  confirmAction: null,
};

/* ---------------------------------------------------------
   NOTES DOMAIN LOGIC
--------------------------------------------------------- */
const notes = {
  init() {
    cloud.init();

    // Paint instantly from whatever we have locally (cache or defaults),
    // so the page never looks empty while the first GitHub read completes.
    const stored = storage.load();
    state.notes = (stored && stored.length) ? stored : defaultNotes.map(n => ({ ...n }));

    if (cloud.enabled) {
      cloud.seedIfEmpty(defaultNotes).finally(() => {
        cloud.subscribe(list => {
          state.notes = list;
          storage.save(state.notes); // keep a local cache for instant next-load
          ui.renderAll();
        });
      });
    } else if (!stored || !stored.length) {
      storage.save(state.notes);
    }
  },

  persist() {
    storage.save(state.notes);
    cloud.syncFullList(state.notes);
  },

  add(payload) {
    const id = utils.generateId();
    const now = utils.nowIso();
    const note = {
      id,
      category: payload.category.trim(),
      questions: payload.questions,
      answer: payload.answer,
      tags: payload.tags,
      difficulty: payload.difficulty,
      favorite: !!payload.favorite,
      createdAt: now,
      updatedAt: now,
    };
    state.notes.unshift(note);
    notes.persist();
    return note;
  },

  update(id, payload) {
    const note = notes.find(id);
    if (!note) return null;
    note.category = payload.category.trim();
    note.questions = payload.questions;
    note.answer = payload.answer;
    note.tags = payload.tags;
    note.difficulty = payload.difficulty;
    note.favorite = !!payload.favorite;
    note.updatedAt = utils.nowIso();
    notes.persist();
    return note;
  },

  remove(id) {
    state.notes = state.notes.filter(n => n.id !== id);
    notes.persist();
  },

  duplicate(id) {
    const source = notes.find(id);
    if (!source) return null;
    const now = utils.nowIso();
    const copy = {
      ...source,
      id: utils.generateId(),
      questions: [...source.questions],
      tags: [...source.tags],
      category: source.category,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    state.notes.unshift(copy);
    notes.persist();
    return copy;
  },

  toggleFavorite(id) {
    const note = notes.find(id);
    if (!note) return;
    note.favorite = !note.favorite;
    note.updatedAt = utils.nowIso();
    notes.persist();
  },

  find(id) {
    return state.notes.find(n => n.id === id) || null;
  },

  replaceAll(list) {
    state.notes = list;
    notes.persist();
  },

  categories() {
    return [...new Set(state.notes.map(n => n.category))].sort((a, b) => a.localeCompare(b));
  },

  getFiltered() {
    const { search, category, difficulty, favoritesOnly } = state.filters;
    const q = search.trim().toLowerCase();

    let list = state.notes.filter(note => {
      if (category !== 'all' && note.category !== category) return false;
      if (difficulty !== 'all' && note.difficulty !== difficulty) return false;
      if (favoritesOnly && !note.favorite) return false;

      if (!q) return true;
      const haystack = [
        note.category,
        note.difficulty,
        ...note.questions,
        note.answer,
        ...note.tags,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });

    return notes.applySort(list);
  },

  applySort(list) {
    const difficultyRank = { Easy: 0, Medium: 1, Hard: 2 };
    const sorted = [...list];

    switch (state.sort) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'category':
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'difficulty':
        sorted.sort((a, b) => difficultyRank[a.difficulty] - difficultyRank[b.difficulty]);
        break;
      case 'favorites':
        sorted.sort((a, b) => Number(b.favorite) - Number(a.favorite));
        break;
      case 'alphabetical':
        sorted.sort((a, b) => (a.questions[0] || '').localeCompare(b.questions[0] || ''));
        break;
      case 'newest':
      default:
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    // Favorites always float to the top, regardless of chosen sort,
    // except when the user explicitly sorted oldest/newest by date only... 
    // Spec: "Favorite notes always appear first" — enforce globally.
    sorted.sort((a, b) => Number(b.favorite) - Number(a.favorite));
    return sorted;
  },

  stats() {
    const total = state.notes.length;
    const categories = notes.categories().length;
    const favorites = state.notes.filter(n => n.favorite).length;
    const easy = state.notes.filter(n => n.difficulty === 'Easy').length;
    const medium = state.notes.filter(n => n.difficulty === 'Medium').length;
    const hard = state.notes.filter(n => n.difficulty === 'Hard').length;
    const lastUpdated = state.notes.reduce((latest, n) => {
      if (!latest) return n;
      return new Date(n.updatedAt) > new Date(latest.updatedAt) ? n : latest;
    }, null);
    return { total, categories, favorites, easy, medium, hard, lastUpdated };
  },

  isValidImport(list) {
    if (!Array.isArray(list)) return false;
    return list.every(n =>
      n && typeof n === 'object' &&
      typeof n.category === 'string' &&
      Array.isArray(n.questions) && n.questions.length > 0 &&
      typeof n.answer === 'string' &&
      Array.isArray(n.tags) &&
      ['Easy', 'Medium', 'Hard'].includes(n.difficulty)
    );
  },
};

/* ---------------------------------------------------------
   UI RENDERING
--------------------------------------------------------- */
const ui = {
  els: {},

  cacheEls() {
    ui.els = {
      dashboardStats: document.getElementById('dashboardStats'),
      statsList: document.getElementById('statsList'),
      searchInput: document.getElementById('searchInput'),
      categoryFilter: document.getElementById('categoryFilter'),
      difficultyFilter: document.getElementById('difficultyFilter'),
      favoritesOnly: document.getElementById('favoritesOnly'),
      sortSelect: document.getElementById('sortSelect'),
      notesList: document.getElementById('notesList'),
      emptyState: document.getElementById('emptyState'),
      resultsCount: document.getElementById('resultsCount'),
      revisionBanner: document.getElementById('revisionBanner'),
      btnRevision: document.getElementById('btnRevision'),
      syncStatus: document.getElementById('syncStatus'),

      editorOverlay: document.getElementById('editorOverlay'),
      editorTitle: document.getElementById('editorTitle'),
      noteForm: document.getElementById('noteForm'),
      noteId: document.getElementById('noteId'),
      noteCategory: document.getElementById('noteCategory'),
      categoryOptions: document.getElementById('categoryOptions'),
      questionsEditor: document.getElementById('questionsEditor'),
      noteAnswer: document.getElementById('noteAnswer'),
      noteTags: document.getElementById('noteTags'),
      noteDifficulty: document.getElementById('noteDifficulty'),
      noteFavorite: document.getElementById('noteFavorite'),

      confirmOverlay: document.getElementById('confirmOverlay'),
      confirmTitle: document.getElementById('confirmTitle'),
      confirmMessage: document.getElementById('confirmMessage'),

      toastContainer: document.getElementById('toastContainer'),
      importFile: document.getElementById('importFile'),
    };
  },

  renderAll() {
    ui.renderSidebarStats();
    ui.renderCategoryFilter();
    ui.renderCategoryDatalist();
    ui.renderNotesList();
  },

  renderSyncStatus() {
    if (cloud.enabled) {
      ui.els.syncStatus.textContent = 'Live — shared via GitHub';
      ui.els.syncStatus.className = 'brand-sub sync-live';
    } else {
      ui.els.syncStatus.textContent = 'Local only — add GitHub config to share';
      ui.els.syncStatus.className = 'brand-sub sync-local';
    }
  },

  renderSidebarStats() {
    const s = notes.stats();
    ui.els.dashboardStats.innerHTML = `
      <div class="stat-card"><span class="stat-num">${s.total}</span><span class="stat-label">Total Notes</span></div>
      <div class="stat-card"><span class="stat-num">${s.categories}</span><span class="stat-label">Categories</span></div>
      <div class="stat-card"><span class="stat-num">${s.favorites}</span><span class="stat-label">Favorites</span></div>
      <div class="stat-card wide">
        <span class="stat-label">Last Updated</span>
        <span class="stat-num">${s.lastUpdated ? utils.escapeHtml(s.lastUpdated.category) : '—'}</span>
      </div>
    `;

    ui.els.statsList.innerHTML = `
      <li>Total Notes <span class="v">${s.total}</span></li>
      <li>Total Categories <span class="v">${s.categories}</span></li>
      <li>Favorites <span class="v">${s.favorites}</span></li>
      <li>Easy <span class="v">${s.easy}</span></li>
      <li>Medium <span class="v">${s.medium}</span></li>
      <li>Hard <span class="v">${s.hard}</span></li>
    `;
  },

  renderCategoryFilter() {
    const current = state.filters.category;
    const cats = notes.categories();
    ui.els.categoryFilter.innerHTML = `<option value="all">All categories</option>` +
      cats.map(c => `<option value="${utils.escapeHtml(c)}">${utils.escapeHtml(c)}</option>`).join('');
    ui.els.categoryFilter.value = cats.includes(current) ? current : 'all';
  },

  renderCategoryDatalist() {
    const cats = notes.categories();
    ui.els.categoryOptions.innerHTML = cats.map(c => `<option value="${utils.escapeHtml(c)}"></option>`).join('');
  },

  renderNotesList() {
    const list = notes.getFiltered();
    ui.els.resultsCount.textContent = `${list.length} note${list.length === 1 ? '' : 's'}`;
    ui.els.revisionBanner.classList.toggle('hidden', !state.revisionMode);

    if (!list.length) {
      ui.els.notesList.innerHTML = '';
      ui.els.emptyState.classList.remove('hidden');
      return;
    }
    ui.els.emptyState.classList.add('hidden');
    ui.els.notesList.innerHTML = list.map(ui.noteCardHtml).join('');
  },

  noteCardHtml(note) {
    const revisionOn = state.revisionMode;
    const revealed = state.revealedInRevision.has(note.id);
    const expanded = state.expandedAnswers.has(note.id);
    const showAnswer = revisionOn ? revealed : expanded;

    const questionsHtml = note.questions.map((q, i) => `
      <li class="question-item" data-index="${String(i + 1).padStart(2, '0')}" data-action="${revisionOn ? 'reveal-answer' : ''}" data-id="${note.id}">
        ${utils.escapeHtml(q)}
      </li>
    `).join('');

    const tagsHtml = note.tags.map(t => `<span class="tag-chip">#${utils.escapeHtml(t)}</span>`).join('');

    return `
      <article class="note-card ${note.favorite ? 'is-favorite' : ''} ${revisionOn ? 'revision-mode' : ''}" data-difficulty="${note.difficulty}" data-note-id="${note.id}">
        <div class="note-head">
          <div>
            <div class="note-meta-line">
              <span class="badge badge-category">${utils.escapeHtml(note.category)}</span>
              <span class="badge badge-difficulty" data-level="${note.difficulty}">${note.difficulty}</span>
              <span class="note-dates">created ${utils.formatDate(note.createdAt)} · updated ${utils.formatDate(note.updatedAt)}</span>
            </div>
            <ul class="question-list">${questionsHtml}</ul>
          </div>
          <div class="note-actions">
            <button class="icon-toggle ${note.favorite ? 'active' : ''}" data-action="toggle-favorite" data-id="${note.id}" title="Toggle favorite">★</button>
            <button class="icon-toggle" data-action="duplicate" data-id="${note.id}" title="Duplicate note">⧉</button>
            <button class="icon-toggle" data-action="edit" data-id="${note.id}" title="Edit note">✎</button>
            <button class="icon-toggle" data-action="delete" data-id="${note.id}" title="Delete note">✕</button>
          </div>
        </div>

        ${!revisionOn ? `<button class="answer-toggle" data-action="toggle-answer" data-id="${note.id}">${expanded ? '▾ Hide answer' : '▸ Show answer'}</button>` : ''}

        <div class="answer-body ${showAnswer ? '' : 'collapsed'}" data-answer-for="${note.id}">
          ${markdown.render(note.answer)}
          <div class="answer-actions">
            <button class="btn btn-ghost btn-small" data-action="copy-answer" data-id="${note.id}" style="width:auto;margin:0;">Copy answer</button>
          </div>
        </div>

        <div class="tags-row">${tagsHtml}</div>
      </article>
    `;
  },

  /* ---- editor modal ---- */
  openEditor(id = null) {
    state.editingId = id;
    const note = id ? notes.find(id) : null;

    ui.els.editorTitle.textContent = note ? 'Edit Note' : 'New Note';
    ui.els.noteId.value = note ? note.id : '';
    ui.els.noteCategory.value = note ? note.category : '';
    ui.els.noteAnswer.value = note ? note.answer : '';
    ui.els.noteTags.value = note ? note.tags.join(', ') : '';
    ui.els.noteDifficulty.value = note ? note.difficulty : 'Easy';
    ui.els.noteFavorite.checked = note ? note.favorite : false;

    const questions = note && note.questions.length ? note.questions : [''];
    ui.renderQuestionsEditor(questions);

    ui.renderCategoryDatalist();
    ui.els.editorOverlay.classList.remove('hidden');
    ui.els.noteCategory.focus();
  },

  closeEditor() {
    ui.els.editorOverlay.classList.add('hidden');
    state.editingId = null;
    ui.els.noteForm.reset();
  },

  renderQuestionsEditor(questions) {
    ui.els.questionsEditor.innerHTML = questions.map((q, i) => `
      <div class="question-edit-row">
        <input type="text" class="input question-edit-input" value="${utils.escapeHtml(q)}" placeholder="Question ${i + 1}" required>
        <button type="button" class="btn-remove-q" data-action="remove-question" ${questions.length <= 1 ? 'disabled' : ''} title="Remove question">−</button>
      </div>
    `).join('');
  },

  addQuestionRow() {
    const rows = [...ui.els.questionsEditor.querySelectorAll('.question-edit-input')].map(i => i.value);
    rows.push('');
    ui.renderQuestionsEditor(rows);
    const inputs = ui.els.questionsEditor.querySelectorAll('.question-edit-input');
    inputs[inputs.length - 1].focus();
  },

  removeQuestionRow(rowEl) {
    const rows = [...ui.els.questionsEditor.querySelectorAll('.question-edit-row')];
    if (rows.length <= 1) return;
    rowEl.remove();
    const remainingInputs = [...ui.els.questionsEditor.querySelectorAll('.question-edit-input')];
    remainingInputs.forEach((input, i) => {
      input.placeholder = `Question ${i + 1}`;
    });
    const disableRemove = remainingInputs.length <= 1;
    ui.els.questionsEditor.querySelectorAll('.btn-remove-q').forEach(btn => { btn.disabled = disableRemove; });
  },

  /* ---- confirm dialog ---- */
  openConfirm(title, message, onConfirm) {
    ui.els.confirmTitle.textContent = title;
    ui.els.confirmMessage.textContent = message;
    state.confirmAction = onConfirm;
    ui.els.confirmOverlay.classList.remove('hidden');
  },

  closeConfirm() {
    ui.els.confirmOverlay.classList.add('hidden');
    state.confirmAction = null;
  },

  /* ---- toasts ---- */
  toast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    el.textContent = message;
    ui.els.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  },
};

/* ---------------------------------------------------------
   EVENT WIRING
--------------------------------------------------------- */
const events = {
  bind() {
    // sidebar filters
    ui.els.searchInput.addEventListener('input', utils.debounce(e => {
      state.filters.search = e.target.value;
      ui.renderNotesList();
    }, 150));

    ui.els.categoryFilter.addEventListener('change', e => {
      state.filters.category = e.target.value;
      ui.renderNotesList();
    });

    ui.els.difficultyFilter.addEventListener('change', e => {
      state.filters.difficulty = e.target.value;
      ui.renderNotesList();
    });

    ui.els.favoritesOnly.addEventListener('change', e => {
      state.filters.favoritesOnly = e.target.checked;
      ui.renderNotesList();
    });

    ui.els.sortSelect.addEventListener('change', e => {
      state.sort = e.target.value;
      ui.renderNotesList();
    });

    // revision mode
    ui.els.btnRevision.addEventListener('click', () => {
      state.revisionMode = !state.revisionMode;
      state.revealedInRevision.clear();
      ui.els.btnRevision.classList.toggle('btn-primary', state.revisionMode);
      ui.els.btnRevision.classList.toggle('btn-outline', !state.revisionMode);
      ui.renderNotesList();
    });

    // header actions
    document.getElementById('btnNewNote').addEventListener('click', () => ui.openEditor(null));
    document.getElementById('btnCloseEditor').addEventListener('click', ui.closeEditor);
    document.getElementById('btnCancelEditor').addEventListener('click', ui.closeEditor);
    ui.els.editorOverlay.addEventListener('click', e => { if (e.target === ui.els.editorOverlay) ui.closeEditor(); });

    document.getElementById('btnAddQuestion').addEventListener('click', () => ui.addQuestionRow());

    ui.els.questionsEditor.addEventListener('click', e => {
      const btn = e.target.closest('[data-action="remove-question"]');
      if (btn) ui.removeQuestionRow(btn.closest('.question-edit-row'));
    });

    ui.els.noteForm.addEventListener('submit', e => {
      e.preventDefault();
      events.saveNoteFromForm();
    });

    // data tools
    document.getElementById('btnExport').addEventListener('click', () => {
      utils.downloadJSON(state.notes, 'InterviewNotes.json');
      ui.toast('✓ Exported');
    });

    document.getElementById('btnImportTrigger').addEventListener('click', () => ui.els.importFile.click());

    ui.els.importFile.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await utils.readFileAsText(file);
        const parsed = JSON.parse(text);
        if (!notes.isValidImport(parsed)) {
          ui.toast('✗ Invalid file structure', 'error');
          return;
        }
        const normalised = parsed.map(n => ({
          id: typeof n.id === 'number' ? n.id : 0,
          category: n.category,
          questions: n.questions,
          answer: n.answer,
          tags: n.tags,
          difficulty: n.difficulty,
          favorite: !!n.favorite,
          createdAt: n.createdAt || utils.nowIso(),
          updatedAt: n.updatedAt || utils.nowIso(),
        }));
        // re-sequence ids to avoid collisions
        normalised.forEach((n, i) => { n.id = i + 1; });
        notes.replaceAll(normalised);
        ui.renderAll();
        ui.toast('✓ Imported');
      } catch {
        ui.toast('✗ Could not read file', 'error');
      } finally {
        ui.els.importFile.value = '';
      }
    });

    document.getElementById('btnReset').addEventListener('click', () => {
      ui.openConfirm(
        'Reset all notes?',
        'This replaces every note with the default set. This cannot be undone.',
        () => {
          notes.replaceAll(defaultNotes.map(n => ({ ...n })));
          ui.renderAll();
          ui.toast('✓ Reset Complete');
        }
      );
    });

    // confirm dialog
    document.getElementById('btnConfirmCancel').addEventListener('click', ui.closeConfirm);
    document.getElementById('btnConfirmOk').addEventListener('click', () => {
      const action = state.confirmAction;
      ui.closeConfirm();
      if (typeof action === 'function') action();
    });
    ui.els.confirmOverlay.addEventListener('click', e => { if (e.target === ui.els.confirmOverlay) ui.closeConfirm(); });

    // note list — event delegation
    ui.els.notesList.addEventListener('click', events.handleNoteListClick);

    // keyboard shortcuts
    document.addEventListener('keydown', events.handleKeydown);
  },

  handleNoteListClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    const id = Number(actionEl.dataset.id);
    if (!action) return;

    switch (action) {
      case 'toggle-favorite':
        notes.toggleFavorite(id);
        ui.renderSidebarStats();
        ui.renderNotesList();
        break;

      case 'duplicate':
        notes.duplicate(id);
        ui.renderAll();
        ui.toast('✓ Duplicated');
        break;

      case 'edit':
        ui.openEditor(id);
        break;

      case 'delete':
        ui.openConfirm('Delete this note?', 'This note will be permanently removed.', () => {
          notes.remove(id);
          state.expandedAnswers.delete(id);
          ui.renderAll();
          ui.toast('✓ Deleted');
        });
        break;

      case 'toggle-answer':
        if (state.expandedAnswers.has(id)) state.expandedAnswers.delete(id);
        else state.expandedAnswers.add(id);
        ui.renderNotesList();
        break;

      case 'reveal-answer':
        state.revealedInRevision.add(id);
        ui.renderNotesList();
        break;

      case 'copy-answer': {
        const note = notes.find(id);
        if (!note) return;
        navigator.clipboard.writeText(note.answer)
          .then(() => ui.toast('✓ Copied'))
          .catch(() => ui.toast('✗ Copy failed', 'error'));
        break;
      }
      default:
        break;
    }
  },

  saveNoteFromForm() {
    const category = ui.els.noteCategory.value.trim();
    const answer = ui.els.noteAnswer.value.trim();
    const difficulty = ui.els.noteDifficulty.value;
    const favorite = ui.els.noteFavorite.checked;
    const tags = ui.els.noteTags.value.split(',').map(t => t.trim()).filter(Boolean);
    const questions = [...ui.els.questionsEditor.querySelectorAll('.question-edit-input')]
      .map(i => i.value.trim())
      .filter(Boolean);

    if (!category || !answer || questions.length === 0) {
      ui.toast('✗ Please complete all required fields', 'error');
      return;
    }

    const payload = { category, answer, difficulty, favorite, tags, questions };
    const id = ui.els.noteId.value ? Number(ui.els.noteId.value) : null;

    if (id) {
      notes.update(id, payload);
      ui.toast('✓ Saved');
    } else {
      notes.add(payload);
      ui.toast('✓ Saved');
    }

    ui.closeEditor();
    ui.renderAll();
  },

  handleKeydown(e) {
    const editorOpen = !ui.els.editorOverlay.classList.contains('hidden');
    const confirmOpen = !ui.els.confirmOverlay.classList.contains('hidden');

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      if (!editorOpen) ui.openEditor(null);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      if (editorOpen) {
        e.preventDefault();
        events.saveNoteFromForm();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (editorOpen) ui.closeEditor();
      else if (confirmOpen) ui.closeConfirm();
    }
  },
};

/* ---------------------------------------------------------
   APP BOOTSTRAP
--------------------------------------------------------- */
const app = {
  start() {
    ui.cacheEls();
    events.bind();
    notes.init();
    ui.renderAll();
    ui.renderSyncStatus();
  },
};

document.addEventListener('DOMContentLoaded', app.start);
