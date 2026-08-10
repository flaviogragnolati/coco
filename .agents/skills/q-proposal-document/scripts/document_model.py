from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any, Iterable

from labels import LABELS
from simple_yaml import load as load_yaml_value, loads as loads_yaml


GENERAL_TERMS_ID = 'quasar-general-terms-ar-es-v1'
GENERATOR_ID = 'q-proposal-document'


def load_yaml(path: Path) -> dict[str, Any]:
    if path.suffix.lower() == '.json':
        value = json.loads(path.read_text(encoding='utf-8-sig'))
    else:
        value = load_yaml_value(path)
    if not isinstance(value, dict):
        raise ValueError(f'Expected an object in {path}')
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def parse_mapping(path: Path) -> dict[str, Any]:
    lines = path.read_text(encoding='utf-8-sig').splitlines()
    if not lines or lines[0].strip() != '---':
        raise ValueError('04-document-mapping.md must start with YAML front matter')
    try:
        end = next(index for index, line in enumerate(lines[1:], 1) if line.strip() == '---')
    except StopIteration as exc:
        raise ValueError('04-document-mapping.md has no closing YAML delimiter') from exc
    value = loads_yaml('\n'.join(lines[1:end]))
    if not isinstance(value, dict):
        raise ValueError('Document mapping front matter must be an object')
    return value


def schema_errors(instance: dict[str, Any], schema_path: Path) -> list[str]:
    name = schema_path.name
    if name == '02-proposal-source.schema.yaml':
        return validate_proposal_source_shape(instance)
    if name == '04-document-mapping.schema.yaml':
        return validate_mapping_shape(instance)
    if name == '04-validation-report.schema.json':
        return validate_report_shape(instance)
    return [f'Unsupported schema profile: {name}']


def as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def first(container: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in container and container[key] not in (None, '', [], {}):
            return container[key]
    return default


def text(value: Any) -> str:
    if value is None:
        return ''
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (str, int, float)):
        return str(value).strip()
    if isinstance(value, dict):
        title = text(first(value, 'title', 'name', 'label', 'id', default=''))
        description = text(first(value, 'description', 'summary', 'detail', 'value', default=''))
        if title and description and title.casefold() != description.casefold():
            return f'{title}: {description}'
        return title or description
    return str(value).strip()


def paragraphs(value: Any) -> list[str]:
    if isinstance(value, dict):
        nested = first(value, 'paragraphs', 'items', 'bullets', default=None)
        if nested is not None:
            return paragraphs(nested)
        rendered = text(value)
        return [rendered] if rendered else []
    result = []
    for item in as_list(value):
        rendered = text(item)
        if rendered:
            result.append(rendered)
    return result


def object_lists(source: dict[str, Any], key: str) -> list[dict[str, Any]]:
    values = [
        item for item in as_list(as_dict(source.get('objects')).get(key))
        if isinstance(item, dict)
    ]
    refs = set(as_list(
        as_dict(as_dict(source.get('downstream_interfaces')).get('document')).get('object_refs')
    ))
    return [item for item in values if item.get('id') in refs] if refs else values


def item_field(item: dict[str, Any], *keys: str) -> str:
    return text(first(item, *keys, default=''))


def mapped_rows(
    items: Iterable[dict[str, Any]], mapping: dict[str, tuple[str, ...]]
) -> list[dict[str, str]]:
    return [
        {target: item_field(item, *aliases) for target, aliases in mapping.items()}
        for item in items
    ]


def amount_text(value: Any, currency: str) -> str:
    if isinstance(value, dict):
        amount = first(value, 'formatted', 'amount', 'value', 'total', default='')
        local_currency = text(first(value, 'currency', default=currency))
        return f'{local_currency} {text(amount)}'.strip()
    rendered = text(value)
    has_currency = re.search(r'\b(?:USD|ARS|EUR|GBP|BRL|UYU|CLP|MXN)\b', rendered)
    if rendered and currency and not has_currency and currency.casefold() not in rendered.casefold():
        return f'{currency} {rendered}'
    return rendered


def resolve_toggle(value: Any, available: bool) -> bool:
    if isinstance(value, bool):
        return value and available
    return available if value == 'auto' else False


def pending(language: str, field: str) -> str:
    return f'PENDIENTE: {field}' if language == 'spanish' else f'PENDING: {field}'


def row_sources(value: Any, *keys: str) -> list[dict[str, Any]]:
    source = value
    if isinstance(source, dict):
        source = first(source, *keys, default=[])
    return [item for item in as_list(source) if isinstance(item, dict)]


OBJECT_TYPES = {
    'findings': 'finding', 'evidence': 'evidence', 'problems': 'problem',
    'needs': 'need', 'objectives': 'objective', 'actors': 'actor',
    'processes': 'process', 'journeys': 'journey', 'capabilities': 'capability',
    'functional_requirements': 'functional_requirement',
    'business_rules': 'business_rule', 'scope_items': 'scope_item',
    'exclusions': 'exclusion', 'deliverables': 'deliverable',
    'technical_requirements': 'technical_requirement',
    'non_functional_requirements': 'non_functional_requirement',
    'constraints': 'constraint', 'integrations': 'integration',
    'data_categories': 'data_category', 'assumptions': 'assumption',
    'inferences': 'inference', 'decisions': 'decision', 'risks': 'risk',
}


def required_keys(value: Any, keys: Iterable[str], path: str) -> list[str]:
    if not isinstance(value, dict):
        return [f'{path} must be an object']
    return [f'{path}.{key} is required' for key in keys if key not in value]


def validate_proposal_source_shape(value: dict[str, Any]) -> list[str]:
    errors = required_keys(
        value,
        ('schema_version', 'artifact', 'proposal', 'objects', 'commercial',
         'delivery', 'downstream_interfaces', 'traceability'),
        '<root>',
    )
    allowed = {
        'schema_version', 'artifact', 'proposal', 'objects', 'commercial',
        'delivery', 'downstream_interfaces', 'traceability',
    }
    for key in value:
        if key not in allowed:
            errors.append(f'<root>.{key} is not allowed')
    if value.get('schema_version') != '1.0':
        errors.append('schema_version must be 1.0')

    artifact = as_dict(value.get('artifact'))
    errors.extend(required_keys(
        artifact,
        ('artifact_id', 'creation_mode', 'semantic_authority', 'version', 'lifecycle'),
        'artifact',
    ))
    if artifact.get('creation_mode') != 'authored':
        errors.append('artifact.creation_mode must be authored')
    if artifact.get('semantic_authority') != 'canonical':
        errors.append('artifact.semantic_authority must be canonical')
    if artifact.get('lifecycle') not in ('Working', 'Active', 'Superseded', 'Archived'):
        errors.append('artifact.lifecycle has an invalid value')

    proposal = as_dict(value.get('proposal'))
    errors.extend(required_keys(
        proposal, ('proposal_id', 'version', 'commercial_status', 'documentation_language'),
        'proposal',
    ))
    statuses = (
        'Discovery', 'Proposal in preparation', 'Internal Review', 'Client Draft',
        'Negotiation', 'Accepted', 'Rejected', 'Expired', 'Superseded',
    )
    if proposal.get('commercial_status') not in statuses:
        errors.append('proposal.commercial_status has an invalid value')
    if proposal.get('documentation_language') not in ('english', 'spanish'):
        errors.append('proposal.documentation_language must be english or spanish')
    version_pattern = re.compile(r'^[0-9]+\.[0-9]+(?:\.[0-9]+)?$')
    for path, version in (
        ('artifact.version', artifact.get('version')),
        ('proposal.version', proposal.get('version')),
    ):
        if not isinstance(version, str) or not version_pattern.fullmatch(version):
            errors.append(f'{path} has an invalid version')

    objects = as_dict(value.get('objects'))
    ids = set()
    for key, expected_type in OBJECT_TYPES.items():
        if key not in objects:
            errors.append(f'objects.{key} is required')
            continue
        items = objects.get(key)
        if not isinstance(items, list):
            errors.append(f'objects.{key} must be an array')
            continue
        for index, item in enumerate(items):
            path = f'objects.{key}.{index}'
            errors.extend(required_keys(
                item, ('id', 'type', 'title', 'maturity', 'authority_scope', 'origin_refs'), path
            ))
            if not isinstance(item, dict):
                continue
            item_id = item.get('id')
            if not isinstance(item_id, str) or not re.fullmatch(r'^[A-Z]+-[0-9]{3,}$', item_id):
                errors.append(f'{path}.id has an invalid format')
            elif item_id in ids:
                errors.append(f'{path}.id is duplicated: {item_id}')
            else:
                ids.add(item_id)
            if item.get('type') != expected_type:
                errors.append(f'{path}.type must be {expected_type}')
            if item.get('maturity') not in ('Draft', 'Discovery', 'Preliminary', 'Confirmed'):
                errors.append(f'{path}.maturity has an invalid value')
            if item.get('authority_scope') not in (
                'commercial', 'development', 'global', 'presentation'
            ):
                errors.append(f'{path}.authority_scope has an invalid value')
            if not isinstance(item.get('origin_refs'), list):
                errors.append(f'{path}.origin_refs must be an array')

    if not isinstance(value.get('commercial'), dict):
        errors.append('commercial must be an object')
    if not isinstance(value.get('delivery'), dict):
        errors.append('delivery must be an object')
    interfaces = as_dict(value.get('downstream_interfaces'))
    errors.extend(required_keys(interfaces, ('web', 'document', 'development'), 'downstream_interfaces'))
    for channel in ('web', 'document'):
        interface = as_dict(interfaces.get(channel))
        if not isinstance(interface.get('object_refs'), list):
            errors.append(f'downstream_interfaces.{channel}.object_refs must be an array')
        else:
            for ref in interface['object_refs']:
                if ref not in ids:
                    errors.append(f'downstream_interfaces.{channel}.object_refs has unknown ID: {ref}')
    development = as_dict(interfaces.get('development'))
    dev_required = (
        'applicable', 'reason', 'proposal_version', 'skill_1_input_refs',
        'skill_2_input_refs', 'unresolved_refs', 'readiness',
    )
    errors.extend(required_keys(development, dev_required, 'downstream_interfaces.development'))
    if development.get('readiness') not in (
        'Not applicable', 'Not ready', 'Ready with assumptions', 'Ready'
    ):
        errors.append('downstream_interfaces.development.readiness has an invalid value')
    if not isinstance(value.get('traceability'), list):
        errors.append('traceability must be an array')
    return errors


def validate_mapping_shape(value: dict[str, Any]) -> list[str]:
    errors = required_keys(
        value, ('schema_version', 'artifact', 'source', 'document', 'decisions'), '<root>'
    )
    if value.get('schema_version') != '1.0':
        errors.append('schema_version must be 1.0')
    artifact = as_dict(value.get('artifact'))
    errors.extend(required_keys(
        artifact,
        ('artifact_id', 'creation_mode', 'semantic_authority', 'version', 'lifecycle'),
        'artifact',
    ))
    if artifact.get('artifact_id') != 'commercial-document-mapping':
        errors.append('artifact.artifact_id must be commercial-document-mapping')
    if artifact.get('creation_mode') != 'authored':
        errors.append('artifact.creation_mode must be authored')
    if artifact.get('semantic_authority') != 'supporting':
        errors.append('artifact.semantic_authority must be supporting')
    source = as_dict(value.get('source'))
    errors.extend(required_keys(source, ('artifact_id', 'path', 'version', 'sha256'), 'source'))
    if not re.fullmatch(r'[a-fA-F0-9]{64}', text(source.get('sha256'))):
        errors.append('source.sha256 must contain 64 hexadecimal characters')
    document = as_dict(value.get('document'))
    errors.extend(required_keys(
        document,
        ('mode', 'audience', 'include', 'general_terms_ref', 'output_basename', 'pdf_required'),
        'document',
    ))
    if document.get('mode') not in ('draft', 'issued'):
        errors.append('document.mode must be draft or issued')
    if document.get('audience') not in ('internal', 'client'):
        errors.append('document.audience must be internal or client')
    include = as_dict(document.get('include'))
    for key in ('alternatives', 'technical_solution', 'general_terms', 'signatures', 'change_control'):
        if key not in include:
            errors.append(f'document.include.{key} is required')
    if not isinstance(include.get('general_terms'), bool):
        errors.append('document.include.general_terms must be boolean')
    for key in ('alternatives', 'technical_solution', 'signatures', 'change_control'):
        if include.get(key) not in (True, False, 'auto'):
            errors.append(f'document.include.{key} must be boolean or auto')
    if not isinstance(document.get('pdf_required'), bool):
        errors.append('document.pdf_required must be boolean')
    if not re.fullmatch(r'[a-z0-9][a-z0-9._-]*', text(document.get('output_basename'))):
        errors.append('document.output_basename has an invalid format')
    decisions = value.get('decisions')
    if not isinstance(decisions, list):
        errors.append('decisions must be an array')
    else:
        for index, item in enumerate(decisions):
            errors.extend(required_keys(item, ('id', 'description', 'source_refs'), f'decisions.{index}'))
    return errors


def validate_report_shape(value: dict[str, Any]) -> list[str]:
    required = (
        '_artifact', 'schema_version', 'status', 'ok', 'source', 'mapping',
        'outputs', 'checks', 'errors', 'warnings',
    )
    errors = required_keys(value, required, '<root>')
    if value.get('schema_version') != '1.0':
        errors.append('schema_version must be 1.0')
    if value.get('status') not in ('Passed', 'Passed with warnings', 'Failed'):
        errors.append('status has an invalid value')
    if not isinstance(value.get('ok'), bool):
        errors.append('ok must be boolean')
    if not isinstance(value.get('errors'), list) or not isinstance(value.get('warnings'), list):
        errors.append('errors and warnings must be arrays')
    return errors


def map_commercial(
    commercial: dict[str, Any], labels: dict[str, str], duration: Any
) -> dict[str, Any]:
    currency = text(first(commercial, 'currency', default=''))
    total = first(commercial, 'total', 'amount', 'investment', 'price', default='')
    alternatives = []
    for item in row_sources(first(commercial, 'alternatives', 'options', default=[])):
        alternatives.append({
            'name': item_field(item, 'name', 'title', 'alternative', 'id'),
            'summary': item_field(item, 'summary', 'description', 'approach'),
            'duration': item_field(item, 'duration', 'schedule'),
            'investment': amount_text(
                first(item, 'investment', 'amount', 'price', default=''), currency
            ),
            'limits': item_field(item, 'limits', 'limit', 'scope'),
        })

    options = []
    for item in row_sources(first(commercial, 'price_items', 'pricing', default=[])):
        options.append({
            'alternative': item_field(item, 'alternative', 'name', 'title', 'id'),
            'amount': amount_text(
                first(item, 'amount', 'investment', 'price', 'value', default=''), currency
            ),
            'duration': item_field(item, 'duration', 'schedule'),
        })
    if not options:
        options = [
            {
                'alternative': item['name'],
                'amount': item['investment'],
                'duration': item['duration'],
            }
            for item in alternatives if item['investment']
        ]
    total_display = amount_text(total, currency)
    if not options and total_display:
        options = [{
            'alternative': labels['proposal_option'],
            'amount': total_display,
            'duration': text(duration),
        }]

    payments = mapped_rows(
        row_sources(first(
            commercial, 'payment_schedule', 'payments', 'payment_milestones', default=[]
        )),
        {
            'milestone': ('milestone', 'name', 'title', 'id'),
            'percentage': ('percentage', 'percent', 'share'),
            'condition': ('condition', 'trigger', 'acceptance', 'description'),
        },
    )
    terms = as_dict(first(commercial, 'terms', default={}))
    additional_terms = row_sources(first(
        terms, 'additional', 'particular',
        default=first(commercial, 'terms_additional', default=[]),
    ))
    return {
        'currency': currency,
        'total_display': total_display,
        'alternatives': alternatives,
        'recommended_alternative': text(first(
            commercial, 'recommended_alternative', 'recommendation', default=''
        )),
        'options': options,
        'payments': payments,
        'commercial_terms': paragraphs(first(
            commercial, 'commercial_terms', 'conditions', default=[]
        )),
        'terms': terms,
        'additional_terms': additional_terms,
        'validity_paragraphs': paragraphs(first(
            commercial, 'validity_acceptance', 'acceptance', default=[]
        )),
        'start_conditions': paragraphs(first(commercial, 'start_conditions', default=[])),
        'signatures': as_dict(first(commercial, 'signatures', default={})),
        'change_control': as_dict(first(commercial, 'change_control', default={})),
        'warranty': text(first(commercial, 'warranty', default='')),
    }


def map_delivery(delivery: dict[str, Any]) -> dict[str, Any]:
    stages_value = first(delivery, 'stages', 'work_plan', 'phases', default=[])
    stages = mapped_rows(
        row_sources(stages_value, 'stages', 'items'),
        {
            'stage': ('stage', 'name', 'title', 'id'),
            'activities': ('activities', 'activity', 'description'),
            'deliverables': ('deliverables', 'outputs'),
            'duration': ('duration', 'timing'),
            'milestone': ('milestone', 'completion', 'acceptance'),
        },
    )
    methodology_value = first(delivery, 'methodology', 'approach', default='')
    methodology = as_dict(methodology_value)
    approach = text(first(
        methodology, 'approach', 'description', default=methodology_value
    ))
    practices = paragraphs(first(
        methodology, 'practices', 'activities',
        default=first(delivery, 'practices', default=[]),
    ))
    governance = mapped_rows(
        row_sources(first(
            methodology, 'governance', default=first(delivery, 'governance', default=[])
        )),
        {
            'role': ('role', 'name'),
            'responsibility': ('responsibility', 'description'),
            'cadence': ('cadence', 'frequency'),
        },
    )
    quality = as_dict(first(delivery, 'quality_acceptance', 'quality', default={}))
    acceptance = as_dict(first(delivery, 'acceptance', default={}))
    team = mapped_rows(
        row_sources(first(delivery, 'team', 'roles', default=[])),
        {
            'role': ('role', 'name', 'title'),
            'responsibility': ('responsibility', 'description'),
            'dedication': ('dedication', 'allocation', 'involvement'),
        },
    )
    schedule = as_dict(first(delivery, 'timeline', 'schedule', default={}))
    milestones = mapped_rows(
        row_sources(first(
            schedule, 'milestones', default=first(delivery, 'milestones', default=[])
        )),
        {
            'milestone': ('milestone', 'name', 'title', 'id'),
            'timing': ('timing', 'date', 'duration'),
            'validator': ('validator', 'owner', 'responsible'),
            'dependencies': ('dependencies', 'dependency'),
        },
    )
    return {
        'duration': first(delivery, 'duration', 'estimated_duration', default=''),
        'stages': stages,
        'approach': approach,
        'practices': practices,
        'governance': governance,
        'testing': paragraphs(first(quality, 'testing', 'tests', default=[])),
        'acceptance_steps': paragraphs(first(
            quality, 'acceptance_steps', 'steps',
            default=first(acceptance, 'steps', 'process', default=[]),
        )),
        'warranty': text(first(quality, 'warranty', default='')),
        'team': team,
        'start_condition': text(first(
            schedule, 'start_condition',
            default=first(delivery, 'start_condition', default=''),
        )),
        'milestones': milestones,
    }


def map_technical(source: dict[str, Any], proposal: dict[str, Any]) -> dict[str, Any]:
    technical = as_dict(first(
        proposal, 'technical_solution', 'operational_solution', default={}
    ))
    architecture = paragraphs(first(
        technical, 'architecture', 'overview', 'description', default=[]
    ))
    stack = mapped_rows(
        row_sources(first(technical, 'stack', 'technologies', default=[])),
        {
            'layer': ('layer', 'component'),
            'technology': ('technology', 'name'),
            'notes': ('notes', 'description'),
        },
    )
    nonfunctional = paragraphs(first(
        technical, 'nonfunctional', 'non_functional_requirements', default=[]
    ))
    nonfunctional.extend(
        text(item) for item in object_lists(source, 'non_functional_requirements')
        if text(item)
    )
    security = paragraphs(first(technical, 'security', 'continuity', default=[]))
    security.extend(
        text(item) for item in object_lists(source, 'constraints') if text(item)
    )
    return {
        'architecture': architecture,
        'stack': stack,
        'nonfunctional': nonfunctional,
        'security': security,
    }


def map_deliverables(source: dict[str, Any]) -> list[dict[str, str]]:
    return mapped_rows(
        object_lists(source, 'deliverables'),
        {
            'code': ('id', 'code'),
            'name': ('title', 'name'),
            'format': ('format',),
            'minimum_content': ('minimum_content', 'content', 'description'),
            'acceptance': (
                'acceptance_criterion', 'acceptance', 'completion_criterion'
            ),
        },
    )


def build_render_model(
    source: dict[str, Any], mapping: dict[str, Any], source_path: Path
) -> dict[str, Any]:
    proposal = as_dict(source.get('proposal'))
    commercial_source = as_dict(source.get('commercial'))
    delivery_source = as_dict(source.get('delivery'))
    language = text(proposal.get('documentation_language')).lower() or 'spanish'
    if language not in LABELS:
        language = 'spanish'
    labels = LABELS[language]
    document_mapping = as_dict(mapping.get('document'))
    mode = document_mapping.get('mode', 'draft')

    client = text(first(proposal, 'client_name', 'client', 'customer', default=''))
    project = text(first(
        proposal, 'project_name', 'title', 'name', 'opportunity_name', default=''
    ))
    version = text(first(
        proposal, 'version', default=as_dict(source.get('artifact')).get('version', '')
    ))
    issue_date = text(first(proposal, 'issue_date', 'date', 'issued_at', default=''))
    validity = first(
        proposal, 'valid_until', 'validity',
        default=first(commercial_source, 'valid_until', 'validity', default=''),
    )
    if isinstance(validity, dict):
        validity = first(
            validity, 'valid_until', 'end', 'date', 'description', default=''
        )
    valid_until = text(validity)
    if mode == 'draft':
        client = client or pending(language, labels['client'].lower())
        project = project or pending(language, labels['project'].lower())
        version = version or '0.1'
        issue_date = issue_date or pending(language, labels['issue_date'].lower())
        valid_until = valid_until or pending(language, labels['validity'].lower())

    problems = object_lists(source, 'problems')
    needs = object_lists(source, 'needs')
    findings = object_lists(source, 'findings')
    objectives = object_lists(source, 'objectives')
    scope_items = object_lists(source, 'scope_items')
    exclusions = object_lists(source, 'exclusions')
    assumptions = object_lists(source, 'assumptions')

    delivery = map_delivery(delivery_source)
    commercial = map_commercial(commercial_source, labels, delivery['duration'])
    technical = map_technical(source, proposal)
    deliverables = map_deliverables(source)
    signatures = commercial['signatures'] or as_dict(first(
        proposal, 'signatures', default={}
    ))

    validity_paragraphs = commercial['validity_paragraphs']
    if valid_until and not validity_paragraphs:
        validity_paragraphs = [valid_until]

    solution = first(proposal, 'proposed_solution', 'solution', 'approach', default='')
    outcome = first(proposal, 'expected_outcome', 'outcome', default='')
    need_text = text(needs[0]) if needs else (text(problems[0]) if problems else '')
    investment = commercial['total_display']
    if not investment and commercial['options']:
        investment = commercial['options'][0]['amount']

    include = as_dict(document_mapping.get('include'))
    technical_available = bool(any(technical.values()))
    signatures_available = bool(signatures or validity_paragraphs)
    change_available = bool(commercial['change_control'])
    source_hash = sha256_file(source_path)

    highlights = {
        labels['background']: need_text,
        labels['technical_solution']: text(solution),
        labels['target']: text(outcome),
        labels['duration']: text(delivery['duration']),
        labels['investment']: investment,
    }
    highlights = {key: value for key, value in highlights.items() if value}

    return {
        '_provenance': {
            'creation_mode': 'derived',
            'semantic_authority': 'none',
            'generated_from': [{
                'artifact_id': as_dict(source.get('artifact')).get(
                    'artifact_id', 'proposal-source'
                ),
                'version': version,
                'hash': source_hash,
            }],
            'generated_by': GENERATOR_ID,
            'do_not_edit': True,
        },
        'language': language,
        'labels': labels,
        'metadata': {
            'project_name': project,
            'project_subtitle': text(first(
                proposal, 'project_subtitle', 'subtitle', default=''
            )),
            'client': client,
            'version': version,
            'issue_date': issue_date,
            'valid_until': valid_until,
            'status': text(first(
                proposal, 'commercial_status', 'status', default=''
            )),
            'source_version': version,
            'source_hash': source_hash,
            'source_path': str(source_path.resolve()),
        },
        'executive_summary': {
            'paragraphs': paragraphs(first(
                proposal, 'executive_summary', 'summary', default=''
            )),
            'highlights': highlights,
        },
        'context': {
            'paragraphs': paragraphs(first(
                proposal, 'context', 'background', default=[]
            )),
            'pain_points': [
                text(item) for item in problems + findings if text(item)
            ],
        },
        'objectives': {
            'general': text(objectives[0]) if objectives else text(first(
                proposal, 'objective', 'overall_objective', default=''
            )),
            'specific': [text(item) for item in objectives[1:] if text(item)],
            'success_indicators': row_sources(first(
                proposal, 'success_indicators', default=[]
            )),
        },
        'alternatives': commercial['alternatives'],
        'recommended_alternative': commercial['recommended_alternative'],
        'scope': {
            'included': [text(item) for item in scope_items if text(item)],
            'modules': row_sources(first(proposal, 'modules', default=[])),
            'exclusions': [text(item) for item in exclusions if text(item)],
            'assumptions': [text(item) for item in assumptions if text(item)],
        },
        'methodology': {
            'approach': delivery['approach'],
            'practices': delivery['practices'],
            'governance': delivery['governance'],
        },
        'work_plan': {
            'stages': delivery['stages'],
            'deliverables': deliverables,
        },
        'technical_solution': technical,
        'quality_acceptance': {
            'testing': delivery['testing'],
            'acceptance_steps': delivery['acceptance_steps'],
            'warranty': delivery['warranty'] or commercial['warranty'],
        },
        'team': delivery['team'],
        'timeline': {
            'start_condition': delivery['start_condition'],
            'milestones': delivery['milestones'],
        },
        'commercial': {
            'currency': commercial['currency'],
            'options': commercial['options'],
            'payment_schedule': commercial['payments'],
            'commercial_terms': commercial['commercial_terms'],
        },
        'validity_acceptance': {
            'paragraphs': validity_paragraphs,
            'conditions': commercial['start_conditions'],
        },
        'signatures': signatures,
        'change_control': commercial['change_control'],
        'terms_additional': commercial['additional_terms'],
        'options': {
            'mode': mode,
            'include_alternatives': resolve_toggle(
                include.get('alternatives', 'auto'), bool(commercial['alternatives'])
            ),
            'include_technical_solution': resolve_toggle(
                include.get('technical_solution', 'auto'), technical_available
            ),
            'include_terms': bool(include.get('general_terms', False)),
            'include_signatures': resolve_toggle(
                include.get('signatures', 'auto'), signatures_available
            ),
            'include_change_control': resolve_toggle(
                include.get('change_control', 'auto'), change_available
            ),
            'general_terms_asset': 'general-terms.es.json',
        },
    }


def validate_source_and_mapping(
    source: dict[str, Any],
    mapping: dict[str, Any],
    source_path: Path,
    source_schema: Path,
    mapping_schema: Path,
) -> tuple[list[str], list[str]]:
    errors = schema_errors(source, source_schema) + schema_errors(mapping, mapping_schema)
    warnings: list[str] = []
    proposal = as_dict(source.get('proposal'))
    source_meta = as_dict(mapping.get('source'))
    document = as_dict(mapping.get('document'))
    actual_hash = sha256_file(source_path)
    proposal_version = text(proposal.get('version'))

    if text(source_meta.get('version')) != proposal_version:
        errors.append('Mapping source.version does not match proposal.version')
    if text(source_meta.get('sha256')).lower() != actual_hash:
        errors.append('Mapping source.sha256 does not match the canonical source')
    expected_artifact = text(as_dict(source.get('artifact')).get('artifact_id'))
    if expected_artifact and text(source_meta.get('artifact_id')) != expected_artifact:
        errors.append('Mapping source.artifact_id does not match the canonical source')
    if text(source_meta.get('path')) and Path(text(source_meta.get('path'))).name != source_path.name:
        errors.append('Mapping source.path does not identify the provided canonical source')

    include = as_dict(document.get('include'))
    if include.get('general_terms'):
        language = text(proposal.get('documentation_language')).lower()
        canonical_ref = text(as_dict(
            as_dict(source.get('commercial')).get('terms')
        ).get('general_terms_ref'))
        mapping_ref = text(document.get('general_terms_ref'))
        if language != 'spanish':
            errors.append(
                'The bundled Spanish general terms cannot be used for a non-Spanish document'
            )
        if canonical_ref != GENERAL_TERMS_ID or mapping_ref != GENERAL_TERMS_ID:
            errors.append(
                'General terms require the same authorized reference in source and mapping'
            )
    elif document.get('general_terms_ref') not in (None, ''):
        warnings.append('general_terms_ref is set while general terms are not included')

    commercial = as_dict(source.get('commercial'))
    delivery = as_dict(source.get('delivery'))
    commercial_warranty = text(first(commercial, 'warranty', default=''))
    quality = as_dict(first(delivery, 'quality_acceptance', 'quality', default={}))
    delivery_warranty = text(first(quality, 'warranty', default=''))
    if (
        commercial_warranty and delivery_warranty
        and commercial_warranty.casefold() != delivery_warranty.casefold()
    ):
        errors.append('commercial.warranty contradicts delivery quality warranty')

    if document.get('audience') == 'client' and document.get('mode') != 'issued':
        warnings.append('Client audience is configured with draft mode')
    return errors, warnings


def model_completeness(model: dict[str, Any]) -> tuple[list[str], list[str]]:
    mode = as_dict(model.get('options')).get('mode', 'draft')
    required = {
        'metadata.project_name': as_dict(model.get('metadata')).get('project_name'),
        'metadata.client': as_dict(model.get('metadata')).get('client'),
        'metadata.version': as_dict(model.get('metadata')).get('version'),
        'metadata.issue_date': as_dict(model.get('metadata')).get('issue_date'),
        'metadata.valid_until': as_dict(model.get('metadata')).get('valid_until'),
        'executive_summary.paragraphs': as_dict(model.get('executive_summary')).get('paragraphs'),
        'objectives.general': as_dict(model.get('objectives')).get('general'),
        'scope.included': as_dict(model.get('scope')).get('included'),
        'scope.exclusions': as_dict(model.get('scope')).get('exclusions'),
        'scope.assumptions': as_dict(model.get('scope')).get('assumptions'),
        'methodology.approach': as_dict(model.get('methodology')).get('approach'),
        'work_plan.stages': as_dict(model.get('work_plan')).get('stages'),
        'work_plan.deliverables': as_dict(model.get('work_plan')).get('deliverables'),
        'quality_acceptance.acceptance_steps': as_dict(
            model.get('quality_acceptance')
        ).get('acceptance_steps'),
        'team': model.get('team'),
        'timeline.start_condition': as_dict(model.get('timeline')).get('start_condition'),
        'timeline.milestones': as_dict(model.get('timeline')).get('milestones'),
        'commercial.options': as_dict(model.get('commercial')).get('options'),
        'commercial.payment_schedule': as_dict(model.get('commercial')).get('payment_schedule'),
        'validity_acceptance.paragraphs': as_dict(
            model.get('validity_acceptance')
        ).get('paragraphs'),
    }
    missing = [path for path, value in required.items() if value in (None, '', [], {})]
    errors = [f'Missing required issued content: {path}' for path in missing] if mode == 'issued' else []
    warnings = [f'Missing draft content: {path}' for path in missing] if mode != 'issued' else []

    deliverables = as_dict(model.get('work_plan')).get('deliverables', [])
    for index, item in enumerate(deliverables, 1):
        if not item.get('acceptance'):
            target = errors if mode == 'issued' else warnings
            target.append(f'Deliverable {index} has no acceptance criterion')
    payments = as_dict(model.get('commercial')).get('payment_schedule', [])
    for index, item in enumerate(payments, 1):
        if not item.get('milestone') or not item.get('condition'):
            target = errors if mode == 'issued' else warnings
            target.append(f'Payment {index} has no milestone or verifiable condition')
    percentages = []
    for item in payments:
        value = text(item.get('percentage'))
        match = re.search(r'-?\d+(?:[.,]\d+)?', value)
        if not match:
            percentages = []
            break
        percentages.append(float(match.group(0).replace(',', '.')))
    if percentages and abs(sum(percentages) - 100) > 0.01:
        target = errors if mode == 'issued' else warnings
        target.append(f'Payment percentages total {sum(percentages):g} instead of 100')

    commercial = as_dict(model.get('commercial'))
    currency = text(commercial.get('currency')).upper()
    known_currencies = re.compile(r'\b(?:USD|ARS|EUR|GBP|BRL|UYU|CLP|MXN)\b')
    if currency:
        for index, item in enumerate(commercial.get('options', []), 1):
            tokens = set(known_currencies.findall(text(item.get('amount')).upper()))
            if tokens and currency not in tokens:
                target = errors if mode == 'issued' else warnings
                target.append(
                    f'Commercial option {index} uses {sorted(tokens)} but canonical currency is {currency}'
                )
    return errors, warnings


def expected_facts(model: dict[str, Any]) -> list[str]:
    metadata = as_dict(model.get('metadata'))
    facts = [
        metadata.get('client', ''), metadata.get('project_name', ''),
        metadata.get('version', ''), metadata.get('valid_until', ''),
        metadata.get('source_hash', ''),
    ]
    facts.extend(
        item.get('name', '') for item in model.get('alternatives', [])
    )
    facts.extend(
        item.get('amount', '') for item in as_dict(model.get('commercial')).get('options', [])
    )
    facts.extend(
        item.get('name', '') for item in as_dict(model.get('work_plan')).get('deliverables', [])
    )
    facts.extend(
        item.get('milestone', '') for item in as_dict(model.get('timeline')).get('milestones', [])
    )
    unique = []
    for value in facts:
        rendered = text(value)
        if rendered and rendered not in unique:
            unique.append(rendered)
    return unique
