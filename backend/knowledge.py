from __future__ import annotations

import os
import time
from collections import OrderedDict
from dataclasses import dataclass
from urllib.parse import quote

import httpx

WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
MAX_PAGES = 5
MAX_EXTRACT_CHARS_PER_PAGE = 7_000
MAX_CONTEXT_CHARS = 25_000
CACHE_SECONDS = 60 * 60
CACHE_ENTRIES = 64
REQUEST_TIMEOUT = httpx.Timeout(12.0, connect=4.0)


class KnowledgeError(RuntimeError):
    """Safe-to-display failure from live source retrieval."""


@dataclass(frozen=True)
class KnowledgeSource:
    title: str
    url: str


@dataclass(frozen=True)
class RetrievedKnowledge:
    topic: str
    context: str
    sources: tuple[KnowledgeSource, ...]


_CACHE: OrderedDict[str, tuple[float, RetrievedKnowledge]] = OrderedDict()


def _user_agent() -> str:
    return os.getenv(
        "WIKIMEDIA_USER_AGENT",
        "AVIA-LocalQuiz/1.0 (self-hosted educational app; set contact details for shared deployments)",
    )[:300]


def _cache_key(topic: str) -> str:
    return " ".join(topic.casefold().split())


def _from_cache(topic: str) -> RetrievedKnowledge | None:
    key = _cache_key(topic)
    entry = _CACHE.get(key)
    if entry is None:
        return None
    expires_at, result = entry
    if expires_at <= time.monotonic():
        del _CACHE[key]
        return None
    _CACHE.move_to_end(key)
    return result


def _save_cache(topic: str, result: RetrievedKnowledge) -> None:
    key = _cache_key(topic)
    _CACHE[key] = (time.monotonic() + CACHE_SECONDS, result)
    _CACHE.move_to_end(key)
    while len(_CACHE) > CACHE_ENTRIES:
        _CACHE.popitem(last=False)


async def _get_json(client: httpx.AsyncClient, params: dict[str, str | int]) -> dict:
    try:
        response = await client.get(
            WIKIPEDIA_API,
            params=params,
            headers={"User-Agent": _user_agent(), "Accept": "application/json"},
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 429:
            raise KnowledgeError("Wikipedia is rate limiting live searches. Wait a little or switch to your own notes.")
        response.raise_for_status()
        payload = response.json()
    except KnowledgeError:
        raise
    except httpx.TimeoutException as exc:
        raise KnowledgeError("The live source search timed out. Try again or switch to your own notes.") from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise KnowledgeError("The live source is temporarily unavailable. Try again or switch to your own notes.") from exc
    if not isinstance(payload, dict):
        raise KnowledgeError("The live source returned an unreadable response. Try another title or use your own notes.")
    error = payload.get("error")
    if isinstance(error, dict):
        if error.get("code") in {"maxlag", "ratelimited", "readonly"}:
            raise KnowledgeError("Wikipedia is busy or rate limiting requests. Wait a little or switch to your own notes.")
        raise KnowledgeError("Wikipedia could not complete this topic search. Try another title or use your own notes.")
    return payload


def _article_url(title: str, api_url: object) -> str:
    if isinstance(api_url, str) and api_url.startswith("https://en.wikipedia.org/wiki/"):
        return api_url
    return "https://en.wikipedia.org/wiki/" + quote(title.replace(" ", "_"), safe="()_,-")


async def retrieve_wikipedia(client: httpx.AsyncClient, topic: str) -> RetrievedKnowledge:
    """Retrieve several live English-Wikipedia pages for a topic, never user notes."""
    cleaned_topic = " ".join(topic.split())
    if len(cleaned_topic) < 2:
        raise KnowledgeError("Enter a topic title with at least two characters.")
    cached = _from_cache(cleaned_topic)
    if cached is not None:
        return cached

    # Make one bounded search, then one batched extract request in series.
    search_data = await _get_json(client, {
        "action": "query",
        "list": "search",
        "srsearch": cleaned_topic[:160],
        "srnamespace": 0,
        "srlimit": MAX_PAGES,
        "format": "json",
        "formatversion": 2,
        "maxlag": 5,
    })
    query = search_data.get("query")
    hits = query.get("search", []) if isinstance(query, dict) else []
    page_ids: list[str] = []
    for hit in hits if isinstance(hits, list) else []:
        if not isinstance(hit, dict) or hit.get("ns") != 0 or "pageid" not in hit:
            continue
        title = str(hit.get("title", ""))
        if not title or "(disambiguation)" in title.casefold():
            continue
        page_ids.append(str(hit["pageid"]))
    if not page_ids:
        raise KnowledgeError("Wikipedia found no clear article for that title. Try a more specific title or switch to your own notes.")

    extract_data = await _get_json(client, {
        "action": "query",
        "prop": "extracts|info",
        "explaintext": 1,
        "inprop": "url",
        "pageids": "|".join(page_ids),
        "format": "json",
        "formatversion": 2,
        "maxlag": 5,
    })
    query = extract_data.get("query")
    pages = query.get("pages", []) if isinstance(query, dict) else []
    context_parts: list[str] = []
    sources: list[KnowledgeSource] = []
    remaining = MAX_CONTEXT_CHARS
    for page in pages if isinstance(pages, list) else []:
        if not isinstance(page, dict) or page.get("missing") is not None:
            continue
        title = str(page.get("title", "")).strip()
        if not title or "(disambiguation)" in title.casefold():
            continue
        extract = "\n".join(line.strip() for line in str(page.get("extract", "")).splitlines() if line.strip())
        extract = extract[: min(MAX_EXTRACT_CHARS_PER_PAGE, remaining)].strip()
        if len(extract) < 180:
            continue
        sources.append(KnowledgeSource(title=title, url=_article_url(title, page.get("fullurl"))))
        context_parts.append(f"[Retrieved source: {title}]\n{extract}")
        remaining -= len(extract)
        if remaining <= 0 or len(sources) >= MAX_PAGES:
            break

    if not sources:
        raise KnowledgeError("Wikipedia returned no substantial article text for that title. Try another title or switch to your own notes.")
    result = RetrievedKnowledge(
        topic=cleaned_topic,
        context="\n\n".join(context_parts)[:MAX_CONTEXT_CHARS],
        sources=tuple(sources),
    )
    _save_cache(cleaned_topic, result)
    return result
