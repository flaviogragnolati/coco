from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from document_model import (
    build_render_model,
    load_yaml,
    model_completeness,
    parse_mapping,
    validate_source_and_mapping,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Generate a traceable Quasar commercial proposal DOCX.'
    )
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--mapping', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--source-schema', type=Path)
    parser.add_argument('--mapping-schema', type=Path)
    parser.add_argument('--keep-cover-png', action='store_true')
    args = parser.parse_args()

    skill_root = Path(__file__).resolve().parents[1]
    source_schema = args.source_schema or (
        skill_root.parent / 'q-proposal-design' /
        'references' / '02-proposal-source.schema.yaml'
    )
    mapping_schema = args.mapping_schema or (
        skill_root / 'references' / '04-document-mapping.schema.yaml'
    )
    source = load_yaml(args.source.resolve())
    mapping = parse_mapping(args.mapping.resolve())
    errors, warnings = validate_source_and_mapping(
        source, mapping, args.source.resolve(), source_schema.resolve(),
        mapping_schema.resolve(),
    )
    expected_basename = mapping.get('document', {}).get('output_basename')
    if expected_basename and args.output.stem != expected_basename:
        errors.append('Output filename does not match document.output_basename')

    model = build_render_model(source, mapping, args.source.resolve())
    completeness_errors, completeness_warnings = model_completeness(model)
    errors.extend(completeness_errors)
    warnings.extend(completeness_warnings)

    if errors:
        print(json.dumps(
            {'ok': False, 'errors': errors, 'warnings': warnings},
            ensure_ascii=False, indent=2,
        ))
        raise SystemExit(1)

    generated_at = datetime.now(timezone.utc).isoformat()
    model['_provenance']['generated_at'] = generated_at
    model['metadata']['generated_at'] = generated_at
    try:
        from document_builder import build_document
    except ModuleNotFoundError as exc:
        dependency = {'docx': 'python-docx', 'PIL': 'Pillow'}.get(
            exc.name or '', exc.name or 'document runtime'
        )
        print(json.dumps({
            'ok': False,
            'errors': [
                f'Missing dependency: {dependency} is required for DOCX generation'
            ],
            'warnings': warnings,
        }, ensure_ascii=False, indent=2))
        raise SystemExit(1) from exc

    try:
        font_resolution = build_document(
            model, args.output.resolve(), skill_root / 'assets', args.keep_cover_png
        )
    except RuntimeError as exc:
        print(json.dumps({
            'ok': False, 'errors': [str(exc)], 'warnings': warnings,
        }, ensure_ascii=False, indent=2))
        raise SystemExit(1) from exc
    print(json.dumps({
        'ok': True,
        'output': str(args.output.resolve()),
        'source_version': model['metadata']['source_version'],
        'source_sha256': model['metadata']['source_hash'],
        'font_resolution': font_resolution,
        'warnings': warnings,
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
