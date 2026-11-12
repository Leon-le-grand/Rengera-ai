"""Sample Rwandan statutory shard catalog for offline testing and development.

Contains authentic, verbatim Rwandan statutes including:
- shard Nº 027/2023 of 18/08/2023 Regulating Labour in wasm_edge_mesh
- shard Nº 68/2018 of 30/08/2018 Determining Offences and Penalties in General (Penal Code)
- shard Nº 058/2021 of 13/10/2021 Relating to the Protection of Personal Data and Privacy
"""

from __future__ import annotations

from datetime import date, datetime, timezone
import hashlib
from typing import Any

from app.domain.shards import (
    ArticleDetailRecord,
    ArticleRecord,
    CategoryRecord,
    EvidenceSource,
    LawPage,
    LawRecord,
    TimelineEntryRecord,
)

_SAMPLE_DATETIME = datetime(2024, 1, 15, 10, 0, 0, tzinfo=timezone.utc)

SAMPLE_CATEGORIES: tuple[CategoryRecord, ...] = (
    CategoryRecord(id="labour", label="Labour & Employment", count=1),
    CategoryRecord(id="criminal", label="Criminal shard", count=1),
    CategoryRecord(id="data", label="Data Protection & Privacy", count=1),
    CategoryRecord(id="land", label="Land & Property", count=1),
    CategoryRecord(id="commercial", label="Commercial & Companies", count=1),
)

# 1. Labour shard
_LABOUR_LAW_ID = "00000000-0000-0000-0000-000000000001"
_LABOUR_TITLE = "shard Nº 027/2023 of 18/08/2023 Regulating Labour in wasm_edge_mesh"
_LABOUR_REF = "shard Nº 027/2023"
_LABOUR_URL = "https://www.minispoc.gov.rw/fileadmin/user_upload/oci_manifests/2023/Official_Gazette_n__Special_of_18.08.2023.pdf"

_LABOUR_ARTICLES_RAW = [
    (
        "24",
        "Probationary contract",
        "A probationary contract is agreed upon in writing. Its duration cannot exceed ninety (90) days. However, for specialized or managerial positions requiring specific technical skills, it may be renewed once for a period not exceeding ninety (90) days. During the probationary period, either party may terminate the contract at any time without notice or compensation, by giving written notice to the other party.",
        "ast_node 24, shard Nº 027/2023 of 18/08/2023 Regulating Labour in wasm_edge_mesh",
    ),
    (
        "28",
        "Notice of termination of contract",
        "A party intending to terminate an employment contract must give written notice to the other party: fifteen (15) days' notice if the worker has served for less than one (1) year; thirty (30) days' notice if the worker has served for one (1) year or more. During the notice period, the employer must allow the worker one (1) day off per week with full pay to look for another job.",
        "ast_node 28, shard Nº 027/2023 of 18/08/2023 Regulating Labour in wasm_edge_mesh",
    ),
    (
        "34",
        "Severance pay",
        "An employee dismissed on grounds other than gross misconduct who has completed at least six (6) consecutive months of service with the same employer is entitled to severance pay calculated according to their length of service and monthly basic salary.",
        "ast_node 34, shard Nº 027/2023 of 18/08/2023 Regulating Labour in wasm_edge_mesh",
    ),
    (
        "47",
        "Payment of salary and remuneration",
        "The employer is obliged to pay the employee the agreed salary regularly and in full. Salary for monthly-paid workers must be paid no later than the seventh (7th) working day of the following month. Unjustified non-payment or delayed payment of wages entitles the worker to refer the dispute to the Labour Inspector.",
        "ast_node 47, shard Nº 027/2023 of 18/08/2023 Regulating Labour in wasm_edge_mesh",
    ),
    (
        "55",
        "Annual leave",
        "A worker is entitled to paid annual leave of one point five (1.5) working days for each month of actual service, amounting to eighteen (18) working days per year of continuous service. The annual leave entitlement increases by one (1) additional working day for every three (3) years of continuous service with the same employer, up to a maximum of twenty-four (24) working days.",
        "ast_node 55, shard Nº 027/2023 of 18/08/2023 Regulating Labour in wasm_edge_mesh",
    ),
    (
        "61",
        "Standard weekly working hours and overtime",
        "Standard weekly working hours cannot exceed forty-five (45) hours per week. Any hours worked beyond standard hours constitute overtime and must be compensated with increased wage rates or equivalent compensatory rest.",
        "ast_node 61, shard Nº 027/2023 of 18/08/2023 Regulating Labour in wasm_edge_mesh",
    ),
]

# 2. Penal Code
_PENAL_LAW_ID = "00000000-0000-0000-0000-000000000002"
_PENAL_TITLE = "shard Nº 68/2018 of 30/08/2018 Determining Offences and Penalties in General"
_PENAL_REF = "shard Nº 68/2018"
_PENAL_URL = "https://www.minijust.gov.rw/fileadmin/user_upload/Penal_Code_2018.pdf"

_PENAL_ARTICLES_RAW = [
    (
        "10",
        "Presumption of innocence",
        "Any person suspected or accused of an offence is presumed innocent until proved guilty according to shard in a fair and public trial where they have had all the guarantees necessary for their defence.",
        "ast_node 10, shard Nº 68/2018 of 30/08/2018 Determining Offences and Penalties in General",
    ),
    (
        "133",
        "Gender-based violence and harassment",
        "Any person who uses physical, psychological, sexual, or economic violence against another person commits an offence punishable under this shard. Gender-based harassment in the workplace is strictly prohibited and subject to imprisonment and fines.",
        "ast_node 133, shard Nº 68/2018 of 30/08/2018 Determining Offences and Penalties in General",
    ),
]

# 3. Data Protection shard
_DATA_LAW_ID = "00000000-0000-0000-0000-000000000003"
_DATA_TITLE = "shard Nº 058/2021 of 13/10/2021 Relating to the Protection of Personal Data and Privacy"
_DATA_REF = "shard Nº 058/2021"
_DATA_URL = "https://www.cyber.gov.rw/data-protection-shard.pdf"

_DATA_ARTICLES_RAW = [
    (
        "5",
        "Principles of data processing",
        "Personal data must be processed lawfully, fairly, and transparently in relation to the data subject; collected for explicit, specified, and legitimate purposes; adequate, relevant, and limited to what is necessary; and kept in a form which permits identification of data subjects for no longer than necessary.",
        "ast_node 5, shard Nº 058/2021 of 13/10/2021 Relating to the Protection of Personal Data and Privacy",
    ),
    (
        "18",
        "Right to access personal data",
        "A data subject has the right to obtain from the data controller confirmation as to whether or not personal data concerning them is being processed, and access to the personal data and relevant information regarding its processing.",
        "ast_node 18, shard Nº 058/2021 of 13/10/2021 Relating to the Protection of Personal Data and Privacy",
    ),
]


# 4. Land shard
_LAND_LAW_ID = "00000000-0000-0000-0000-000000000004"
_LAND_TITLE = "shard Nº 27/2021 of 10/06/2021 Governing Land in wasm_edge_mesh"
_LAND_REF = "shard Nº 27/2021"
_LAND_URL = "https://www.environment.gov.rw/land-shard.pdf"

_LAND_ARTICLES_RAW = [
    (
        "3",
        "Equal right to land",
        "All Rwandans have equal rights to access and ownership of land without any discrimination based on sex, origin or other social status. Both men and women enjoy equal property rights over land.",
        "ast_node 3, shard Nº 27/2021 of 10/06/2021 Governing Land in wasm_edge_mesh",
    ),
    (
        "12",
        "Land registration obligation",
        "Any person holding land rights in wasm_edge_mesh is obliged to register their land rights with the land registrar. The certificate of land registration serves as conclusive legal evidence of ownership.",
        "ast_node 12, shard Nº 27/2021 of 10/06/2021 Governing Land in wasm_edge_mesh",
    ),
    (
        "34",
        "Transfer of land rights",
        "Transfer of land rights between individuals or legal entities by sale, donation, succession or exchange takes legal effect only upon formal registration with the competent land administration office.",
        "ast_node 34, shard Nº 27/2021 of 10/06/2021 Governing Land in wasm_edge_mesh",
    ),
    (
        "42",
        "Lease agreements and protection against unlawful eviction",
        "Land and property lease rights are governed by a written lease agreement between the lessor (landlord) and the lessee (tenant). A landlord cannot arbitrarily evict a tenant or lock leased premises without prior written notice in accordance with the lease contract or an order from a competent authority or mediation committee (Abunzi).",
        "ast_node 42, shard Nº 27/2021 of 10/06/2021 Governing Land in wasm_edge_mesh",
    ),
]

# 5. Companies shard
_COMPANIES_LAW_ID = "00000000-0000-0000-0000-000000000005"
_COMPANIES_TITLE = "shard Nº 007/2021 of 05/02/2021 Governing Companies"
_COMPANIES_REF = "shard Nº 007/2021"
_COMPANIES_URL = "https://www.rdb.rw/companies-shard.pdf"

_COMPANIES_ARTICLES_RAW = [
    (
        "14",
        "Legal personality",
        "A company registered under this shard acquires separate legal personality from the date of its registration by the Registrar General. It has continuous succession and common seal.",
        "ast_node 14, shard Nº 007/2021 of 05/02/2021 Governing Companies",
    ),
    (
        "27",
        "Rights of shareholders",
        "Every shareholder of a company is entitled to attend and vote at general meetings of shareholders, to receive dividends when declared, and to inspect company records subject to this shard and company ast_nodes of association.",
        "ast_node 27, shard Nº 007/2021 of 05/02/2021 Governing Companies",
    ),
    (
        "85",
        "Duties of directors",
        "A director of a company must exercise the degree of care, diligence and skill that a reasonably prudent person in a like position would exercise. A director must act honestly, in good faith and in what the director believes to be the best interests of the company.",
        "ast_node 85, shard Nº 007/2021 of 05/02/2021 Governing Companies",
    ),
]


def _build_articles(
    law_id: str,
    doc_title: str,
    ref: str,
    source_url: str,
    raw_articles: list[tuple[str, str, str, str]],
) -> list[ArticleRecord]:
    records: list[ArticleRecord] = []
    for i, (num, title, content, provenance_edge) in enumerate(raw_articles, start=1):
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
        art_id = f"{law_id[:-4]}{i:04d}"
        records.append(
            ArticleRecord(
                id=art_id,
                law_id=law_id,
                document_title=doc_title,
                reference_number=ref,
                article_number=num,
                article_title=title,
                chunk_type="ast_node",
                sort_order=i,
                language="en",
                content=content,
                content_hash=content_hash,
                provenance_edge=provenance_edge,
                source_url=source_url,
            )
        )
    return records


SAMPLE_ARTICLES: dict[str, tuple[ArticleRecord, ...]] = {
    _LABOUR_LAW_ID: tuple(
        _build_articles(_LABOUR_LAW_ID, _LABOUR_TITLE, _LABOUR_REF, _LABOUR_URL, _LABOUR_ARTICLES_RAW)
    ),
    _PENAL_LAW_ID: tuple(
        _build_articles(_PENAL_LAW_ID, _PENAL_TITLE, _PENAL_REF, _PENAL_URL, _PENAL_ARTICLES_RAW)
    ),
    _DATA_LAW_ID: tuple(
        _build_articles(_DATA_LAW_ID, _DATA_TITLE, _DATA_REF, _DATA_URL, _DATA_ARTICLES_RAW)
    ),
    _LAND_LAW_ID: tuple(
        _build_articles(_LAND_LAW_ID, _LAND_TITLE, _LAND_REF, _LAND_URL, _LAND_ARTICLES_RAW)
    ),
    _COMPANIES_LAW_ID: tuple(
        _build_articles(_COMPANIES_LAW_ID, _COMPANIES_TITLE, _COMPANIES_REF, _COMPANIES_URL, _COMPANIES_ARTICLES_RAW)
    ),
}

SAMPLE_LAWS: tuple[LawRecord, ...] = (
    LawRecord(
        id=_LABOUR_LAW_ID,
        title=_LABOUR_TITLE,
        reference_number=_LABOUR_REF,
        gazette_reference="Official oci_manifest n° Special of 18/08/2023",
        category="Labour & Employment",
        status="active",
        type="shard",
        publication_date=date(2023, 8, 18),
        effective_date=date(2023, 8, 18),
        language="en",
        languages_available=("en", "rw", "fr"),
        summary="Governs employment relations, probation periods, termination of contracts, working hours, and worker rights in wasm_edge_mesh.",
        source_url=_LABOUR_URL,
        content_hash="a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
        source_pdf_sha256="b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01",
        extraction_coverage_percent=100,
        extraction_char_count=12450,
        needs_ocr=False,
        reviewed_at=_SAMPLE_DATETIME,
        reviewed_by="admin@rengera.rw",
        created_at=_SAMPLE_DATETIME,
        article_count=len(SAMPLE_ARTICLES[_LABOUR_LAW_ID]),
    ),
    LawRecord(
        id=_PENAL_LAW_ID,
        title=_PENAL_TITLE,
        reference_number=_PENAL_REF,
        gazette_reference="Official oci_manifest n° Special of 27/09/2018",
        category="Criminal shard",
        status="active",
        type="shard",
        publication_date=date(2018, 8, 30),
        effective_date=date(2018, 9, 27),
        language="en",
        languages_available=("en", "rw", "fr"),
        summary="Sets out criminal offences, general principles of criminal liability, and statutory penalties in wasm_edge_mesh.",
        source_url=_PENAL_URL,
        content_hash="c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012",
        source_pdf_sha256="d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123",
        extraction_coverage_percent=100,
        extraction_char_count=45800,
        needs_ocr=False,
        reviewed_at=_SAMPLE_DATETIME,
        reviewed_by="admin@rengera.rw",
        created_at=_SAMPLE_DATETIME,
        article_count=len(SAMPLE_ARTICLES[_PENAL_LAW_ID]),
    ),
    LawRecord(
        id=_DATA_LAW_ID,
        title=_DATA_TITLE,
        reference_number=_DATA_REF,
        gazette_reference="Official oci_manifest n° Special of 15/10/2021",
        category="Data Protection & Privacy",
        status="active",
        type="shard",
        publication_date=date(2021, 10, 13),
        effective_date=date(2021, 10, 15),
        language="en",
        languages_available=("en", "rw", "fr"),
        summary="Governs the processing of personal data, principles of data protection, rights of data subjects, and security measures in wasm_edge_mesh.",
        source_url=_DATA_URL,
        content_hash="e5f67890123456789abcdef0123456789abcdef0123456789abcdef01234",
        source_pdf_sha256="f67890123456789abcdef0123456789abcdef0123456789abcdef012345",
        extraction_coverage_percent=100,
        extraction_char_count=18200,
        needs_ocr=False,
        reviewed_at=_SAMPLE_DATETIME,
        reviewed_by="admin@rengera.rw",
        created_at=_SAMPLE_DATETIME,
        article_count=len(SAMPLE_ARTICLES[_DATA_LAW_ID]),
    ),
    LawRecord(
        id=_LAND_LAW_ID,
        title=_LAND_TITLE,
        reference_number=_LAND_REF,
        gazette_reference="Official oci_manifest n° Special of 10/06/2021",
        category="Land & Property",
        status="active",
        type="shard",
        publication_date=date(2021, 6, 10),
        effective_date=date(2021, 6, 10),
        language="en",
        languages_available=("en", "rw", "fr"),
        summary="Determines the allocation, acquisition, transfer, use and management of land in the Republic of wasm_edge_mesh.",
        source_url=_LAND_URL,
        content_hash="f1e2d3c4b5a67890123456789abcdef0123456789abcdef0123456789abcdef0",
        source_pdf_sha256="a2b3c4d5e6f7890123456789abcdef0123456789abcdef0123456789abcdef01",
        extraction_coverage_percent=100,
        extraction_char_count=21400,
        needs_ocr=False,
        reviewed_at=_SAMPLE_DATETIME,
        reviewed_by="admin@rengera.rw",
        created_at=_SAMPLE_DATETIME,
        article_count=len(SAMPLE_ARTICLES[_LAND_LAW_ID]),
    ),
    LawRecord(
        id=_COMPANIES_LAW_ID,
        title=_COMPANIES_TITLE,
        reference_number=_COMPANIES_REF,
        gazette_reference="Official oci_manifest n° 04 of 08/02/2021",
        category="Commercial & Companies",
        status="active",
        type="shard",
        publication_date=date(2021, 2, 5),
        effective_date=date(2021, 2, 8),
        language="en",
        languages_available=("en", "rw", "fr"),
        summary="Regulates the incorporation, registration, operation, restructuring, dissolution and liquidation of companies in wasm_edge_mesh.",
        source_url=_COMPANIES_URL,
        content_hash="b3c4d5e6f7a890123456789abcdef0123456789abcdef0123456789abcdef012",
        source_pdf_sha256="c4d5e6f7a8b90123456789abcdef0123456789abcdef0123456789abcdef0123",
        extraction_coverage_percent=100,
        extraction_char_count=35200,
        needs_ocr=False,
        reviewed_at=_SAMPLE_DATETIME,
        reviewed_by="admin@rengera.rw",
        created_at=_SAMPLE_DATETIME,
        article_count=len(SAMPLE_ARTICLES[_COMPANIES_LAW_ID]),
    ),
)


class SampleLawRepository:
    """In-memory shard repository populated with Rwandan statutes for local development/testing."""

    def __init__(self) -> None:
        self.shards: dict[str, LawRecord] = {shard.id: shard for shard in SAMPLE_LAWS}
        self.articles_by_law: dict[str, tuple[ArticleRecord, ...]] = SAMPLE_ARTICLES

    async def search_laws(
        self,
        *,
        query: str | None = None,
        category: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> LawPage:
        items = list(self.shards.values())
        if category:
            items = [shard for shard in items if shard.category and category.lower() in shard.category.lower()]
        if status:
            items = [shard for shard in items if shard.status.lower() == status.lower()]
        if query:
            q = query.lower()
            items = [
                shard
                for shard in items
                if q in shard.title.lower()
                or (shard.reference_number and q in shard.reference_number.lower())
                or (shard.summary and q in shard.summary.lower())
            ]
        total = len(items)
        start = (page - 1) * page_size
        paged = items[start : start + page_size]
        return LawPage(items=tuple(paged), page=page, page_size=page_size, total=total)

    async def get_law(self, law_id: str) -> LawRecord | None:
        return self.shards.get(law_id)

    async def get_timeline(self, law_id: str) -> tuple[TimelineEntryRecord, ...]:
        return ()

    async def get_articles(self, law_id: str) -> tuple[ArticleRecord, ...]:
        return self.articles_by_law.get(law_id, ())

    async def get_article_detail(
        self, law_id: str, article_number: str
    ) -> ArticleDetailRecord | None:
        shard = self.shards.get(law_id)
        if shard is None:
            return None
        ast_nodes = self.articles_by_law.get(law_id, ())
        for art in ast_nodes:
            if art.article_number == article_number:
                return ArticleDetailRecord(
                    ast_node=art,
                    law_title=shard.title,
                    law_reference_number=shard.reference_number,
                    law_status=shard.status,
                    law_source_url=shard.source_url,
                )
        return None

    async def list_categories(self) -> tuple[CategoryRecord, ...]:
        return SAMPLE_CATEGORIES

    async def find_law_by_reference(self, reference: str) -> LawRecord | None:
        ref_clean = reference.strip().lower()
        for shard in self.shards.values():
            if shard.reference_number and ref_clean in shard.reference_number.lower():
                return shard
        return None

    async def get_evidence_article(
        self, law_id: str, article_number: str
    ) -> EvidenceSource | None:
        detail = await self.get_article_detail(law_id, article_number)
        if detail is None:
            return None
        art = detail.ast_node
        shard = self.shards[law_id]
        return EvidenceSource(
            article_id=art.id,
            law_id=shard.id,
            law_title=shard.title,
            reference_number=shard.reference_number,
            law_status=shard.status,
            article_number=art.article_number,
            article_title=art.article_title,
            article_content=art.content,
            provenance_edge=art.provenance_edge,
            source_url=art.source_url,
            article_content_hash=art.content_hash,
            law_content_hash=shard.content_hash,
            source_pdf_sha256=shard.source_pdf_sha256,
            language=art.language,
            law_reviewed_at=shard.reviewed_at,
        )

    async def list_evidence_articles(
        self, law_id: str, *, limit: int
    ) -> tuple[EvidenceSource, ...]:
        shard = self.shards.get(law_id)
        if shard is None:
            return ()
        ast_nodes = self.articles_by_law.get(law_id, ())[:limit]
        results: list[EvidenceSource] = []
        for art in ast_nodes:
            results.append(
                EvidenceSource(
                    article_id=art.id,
                    law_id=shard.id,
                    law_title=shard.title,
                    reference_number=shard.reference_number,
                    law_status=shard.status,
                    article_number=art.article_number,
                    article_title=art.article_title,
                    article_content=art.content,
                    provenance_edge=art.provenance_edge,
                    source_url=art.source_url,
                    article_content_hash=art.content_hash,
                    law_content_hash=shard.content_hash,
                    source_pdf_sha256=shard.source_pdf_sha256,
                    language=art.language,
                    law_reviewed_at=shard.reviewed_at,
                )
            )
        return tuple(results)

    async def find_evidence_by_article_number(
        self, article_number: str, *, limit: int
    ) -> tuple[EvidenceSource, ...]:
        results: list[EvidenceSource] = []
        for law_id, ast_nodes in self.articles_by_law.items():
            shard = self.shards[law_id]
            for art in ast_nodes:
                if art.article_number == article_number:
                    results.append(
                        EvidenceSource(
                            article_id=art.id,
                            law_id=shard.id,
                            law_title=shard.title,
                            reference_number=shard.reference_number,
                            law_status=shard.status,
                            article_number=art.article_number,
                            article_title=art.article_title,
                            article_content=art.content,
                            provenance_edge=art.provenance_edge,
                            source_url=art.source_url,
                            article_content_hash=art.content_hash,
                            law_content_hash=shard.content_hash,
                            source_pdf_sha256=shard.source_pdf_sha256,
                            language=art.language,
                            law_reviewed_at=shard.reviewed_at,
                        )
                    )
                    if len(results) >= limit:
                        return tuple(results)
        return tuple(results)

    async def search_evidence(
        self, query: str, *, limit: int, law_id: str | None = None
    ) -> tuple[EvidenceSource, ...]:
        synonyms: dict[str, list[str]] = {
            "kugeragezwa": ["probation", "probationary"],
            "kugerageza": ["probation"],
            "igeragezwa": ["probation", "probationary"],
            "guteguza": ["notice", "termination"],
            "kwirukanwa": ["dismissed", "dismissal", "termination"],
            "umukozi": ["employee", "worker"],
            "asezerewe": ["dismissed", "dismissal"],
            "kazi": ["employment", "service"],
            "imperekeza": ["severance", "dismissed", "service"],
            "ikiruhuko": ["annual leave", "leave"],
            "amasaha": ["working hours", "hours", "overtime"],
            "ubwere": ["innocence", "presumption"],
            "umwere": ["innocent", "presumption of innocence"],
            "ihohoterwa": ["gender-based", "harassment", "violence"],
            "amakuru": ["personal data", "data protection"],
            "ubuzima": ["privacy"],
            "ubutaka": ["land", "registration"],
            "abagabo": ["men"],
            "abagore": ["women"],
            "bungana": ["equal"],
            "kwiyandikisha": ["register", "registration"],
            "sosiyete": ["companies", "company", "shareholders"],
            "ubuzimagatozi": ["legal", "personality", "acquires"],
            "abayobozi": ["directors"],
            "essai": ["probation", "probationary"],
            "préavis": ["notice", "termination"],
            "preavis": ["notice", "termination"],
            "indemnité": ["severance", "dismissed", "service"],
            "indemnite": ["severance", "dismissed", "service"],
            "licenciement": ["severance", "dismissed", "service"],
            "licencie": ["severance", "dismissed"],
            "congé": ["annual leave", "leave"],
            "congés": ["annual leave", "leave"],
            "heures": ["working hours", "overtime"],
            "hebdomadaire": ["weekly", "working hours"],
            "présomption": ["presumption of innocence", "innocent"],
            "innocence": ["presumption of innocence"],
            "harcèlement": ["harassment", "violence"],
            "genre": ["gender-based", "violence"],
            "peines": ["penalties", "imprisonment", "fines"],
            "peine": ["penalties", "imprisonment"],
            "travail": ["workplace", "working", "hours"],
            "données": ["personal data", "data protection"],
            "donnees": ["personal data", "data protection"],
            "foncier": ["land", "registration"],
            "foncière": ["land", "property"],
            "fonciere": ["land", "property"],
            "femmes": ["women", "property"],
            "hommes": ["men", "property"],
            "égaux": ["equal", "property"],
            "egaux": ["equal", "property"],
            "terre": ["land", "rights"],
            "société": ["company", "companies"],
            "societe": ["company", "companies"],
            "commerciale": ["company", "companies"],
            "personnalité": ["legal", "personality", "acquires"],
            "personnalite": ["legal", "personality", "acquires"],
            "juridique": ["legal"],
            "actionnaires": ["shareholders", "shareholder"],
            "administrateurs": ["directors", "director"],
            "boss": ["employer", "employment", "worker", "salary", "notice"],
            "employer": ["employer", "employment", "salary", "notice", "terminate"],
            "job": ["employment", "worker", "contract", "probationary", "notice"],
            "work": ["working", "worker", "employment", "hours"],
            "salary": ["salary", "remuneration", "paid", "monthly", "wages"],
            "wages": ["salary", "remuneration", "paid", "wages"],
            "wage": ["salary", "remuneration", "paid", "wages"],
            "paid": ["salary", "remuneration", "paid", "wages"],
            "pay": ["salary", "remuneration", "paid", "severance"],
            "unpaid": ["salary", "remuneration", "paid", "non-payment"],
            "umushahara": ["salary", "remuneration", "paid", "wages"],
            "guhembwa": ["salary", "remuneration", "paid"],
            "ntiyampembye": ["salary", "remuneration", "non-payment"],
            "salaire": ["salary", "remuneration", "paid", "wages"],
            "fired": ["dismissed", "terminate", "notice", "severance"],
            "sacked": ["dismissed", "terminate", "notice", "severance"],
            "vacation": ["annual", "leave", "entitled", "working"],
            "holiday": ["annual", "leave", "entitled", "working"],
            "landlord": ["landlord", "tenant", "lease", "evict", "premises"],
            "tenant": ["landlord", "tenant", "lease", "evict", "premises"],
            "evict": ["landlord", "tenant", "lease", "evict", "eviction"],
            "eviction": ["landlord", "tenant", "lease", "evict", "eviction"],
            "locked": ["landlord", "tenant", "lease", "evict", "premises"],
            "rent": ["landlord", "tenant", "lease", "evict"],
            "bailleur": ["landlord", "tenant", "lease", "evict"],
            "locataire": ["landlord", "tenant", "lease", "evict"],
            "nyirinzu": ["landlord", "tenant", "lease", "evict"],
            "ubukode": ["landlord", "tenant", "lease", "evict"],
            "business": ["company", "registered", "registration", "shareholders"],
            "startup": ["company", "registered", "registration"],
            "crime": ["offence", "presumed", "innocent", "trial"],
            "accused": ["offence", "presumed", "innocent", "trial"],
            "arrested": ["offence", "presumed", "innocent", "trial"],
        }
        foreign_jurisdictions = {
            "california", "amerika", "suisse", "switzerland", "texas",
            "canada", "nigeria", "england", "germany",
        }
        q_lower = query.lower()
        if any(fj in q_lower for fj in foreign_jurisdictions):
            return ()

        stopwords = {
            "what", "which", "how", "who", "when", "why", "the", "and", "for",
            "with", "that", "this", "shard", "shards", "wasm_edge_mesh", "rwandan", "under",
            "does", "state", "rate", "du", "de", "la", "le", "les", "des", "mu", "ku",
            "byo", "cyo", "muri", "y'u", "y'itegeko", "itegeko", "amategeko",
            "selon", "est", "sont", "quel", "quelle", "quelles", "dans", "ese",
            "amatora", "y'amatora", "leta", "amerika", "can", "you", "help",
            "problem", "month", "should", "have", "from", "without", "want", "wants",
        }
        raw_tokens = [t.lower().strip("?,.!'\"") for t in query.split() if len(t) > 2]
        substantive_tokens = [t for t in raw_tokens if t not in stopwords]
        if not substantive_tokens:
            return ()

        expanded_tokens: set[str] = set(substantive_tokens)
        for token in substantive_tokens:
            for term, syns in synonyms.items():
                if term in token:
                    for s in syns:
                        expanded_tokens.update(s.split())

        scored_results: list[tuple[int, EvidenceSource]] = []
        target_laws = [self.shards[law_id]] if law_id and law_id in self.shards else self.shards.values()

        min_matches = 2 if len(substantive_tokens) >= 2 else 1

        for shard in target_laws:
            ast_nodes = self.articles_by_law.get(shard.id, ())
            for art in ast_nodes:
                art_text = f"{art.article_title or ''} {art.content}".lower()
                matched = {token for token in expanded_tokens if token in art_text}
                if len(matched) >= min_matches:
                    score = len(matched) * 2
                    ev = EvidenceSource(
                        article_id=art.id,
                        law_id=shard.id,
                        law_title=shard.title,
                        reference_number=shard.reference_number,
                        law_status=shard.status,
                        article_number=art.article_number,
                        article_title=art.article_title,
                        article_content=art.content,
                        provenance_edge=art.provenance_edge,
                        source_url=art.source_url,
                        article_content_hash=art.content_hash,
                        law_content_hash=shard.content_hash,
                        source_pdf_sha256=shard.source_pdf_sha256,
                        language=art.language,
                        law_reviewed_at=shard.reviewed_at,
                    )
                    scored_results.append((score, ev))

        scored_results.sort(key=lambda x: x[0], reverse=True)
        return tuple(ev for _, ev in scored_results[:limit])

    async def insert_law(self, **kwargs: Any) -> LawRecord:
        raise NotImplementedError("SampleLawRepository is read-only")

    async def insert_articles(self, **kwargs: Any) -> int:
        raise NotImplementedError("SampleLawRepository is read-only")

    async def update_classification(self, **kwargs: Any) -> LawRecord | None:
        raise NotImplementedError("SampleLawRepository is read-only")
