# C4 model rules

Use this reference when classifying elements or selecting a view. The [official C4 diagrams reference](https://c4model.com/diagrams) is authoritative for the model taxonomy.

## View taxonomy

| Category | View | Scope and useful question |
|---|---|---|
| Static level 1 | System context | Which people and external software systems interact with the system in scope? |
| Static level 2 | Container | Which separately runnable or deployable applications and data stores make up one software system? |
| Static level 3 | Component | Which meaningful components collaborate inside exactly one container? |
| Static level 4 | Code | Which implementation structures explain one component when that detail adds value? |
| Supporting | System landscape | How do people and software systems relate across an enterprise or organization? |
| Supporting | Dynamic | How do selected model elements collaborate for one use case or story over time? |
| Supporting | Deployment | How are container instances deployed onto infrastructure in one environment? |

Use only the levels and supporting views that add value. Never call deployment level 4. Do not create an undefined intermediate level such as “subsystem”; classify it by its actual C4 role or describe it outside the model.

## Element classification

- **Person:** a human role, persona, or group that interacts with a software system.
- **Software system:** the highest-value software scope being described or an external system treated as a black box.
- **Container:** an application or data store that must run, execute, or be deployed for the software system to work. A process, service, SPA, mobile app, database, queue, or file store can qualify. A library, framework, namespace, package, or in-process state manager usually does not.
- **Component:** a cohesive grouping of related functionality inside one container, encapsulated behind a defined interface. A module may map to a component only when evidence confirms that responsibility and container scope.
- **Deployment node / infrastructure node / container instance:** runtime placement and supporting infrastructure for one named environment.

Use team ownership as evidence, not as a rule that automatically promotes a service into a separate software system. Preserve the chosen system boundary consistently across the view set.

## Relationship quality

Represent relationships in one direction whenever possible. State what the source does to or with the destination; add technology or protocol when evidenced. Avoid bare labels such as “uses” when a more specific action is known. Do not turn a request/response pair into two relationships unless both directions carry independently important meaning.

Each view must include only relationships relevant to its story. Dynamic relationships are ordered instances of relationships allowed by the static model; they do not create a parallel model.

## Consistency checks

- Stable IDs preserve identity across all views and backend encodings.
- A component view belongs to exactly one container.
- A container belongs to exactly one software system in the modeled scope.
- A deployment view references container instances from the static model.
- Names, descriptions, technology, direction, and external status do not drift between views.
- Critical rules remain in narrative, ADRs, feature specifications, or another canonical owner; a visual edge alone is insufficient.
