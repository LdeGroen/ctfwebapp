// Compatibility shim — vroeger Appwrite, nu publieke Laravel-endpoints.
// App.jsx en ReservationModal.jsx mogen `Client, Databases, Query, ID` importeren
// uit dit bestand i.p.v. uit het npm-pakket 'appwrite'.

const API_URL = (import.meta.env && import.meta.env.VITE_API_URL) || 'https://backend.cafetheaterfestival.nl';

export const APPWRITE_CONFIG = {
    endpoint: API_URL,
    projectId: 'ctf',
    databaseId: 'crm',
    collections: {
        companies: 'companies',
        performances: 'performances',
        locations: 'locations',
        executions: 'executions',
        events: 'events',
        news: 'nieuws',
        sponsors: 'sponsors',
        info: 'info',
        toegankelijkheid: 'toegankelijkheid',
        marketing: 'marketing',
        routes: 'routes',
        reserveringen: 'reserveringen',
    },
};

function wrapDoc(doc) {
    if (!doc || typeof doc !== 'object') return doc;
    const id = doc.id !== undefined ? String(doc.id) : doc.$id;
    return {
        ...doc,
        $id: id,
        $createdAt: doc.created_at || doc.$createdAt,
        $updatedAt: doc.updated_at || doc.$updatedAt,
        $collectionId: '',
        $databaseId: '',
        $permissions: [],
    };
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(options.headers || {}),
        },
    });
    if (!res.ok) {
        const text = await res.text();
        const err = new Error(`HTTP ${res.status}: ${text}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

export class Client {
    setEndpoint() { return this; }
    setProject() { return this; }
}

export class Databases {
    constructor(_client) {}

    async listDocuments(_db, resource, queries = []) {
        let limit = 5000;
        let offset = 0;
        (queries || []).forEach(q => {
            if (q && q._q === 'limit') limit = q.value;
            if (q && q._q === 'offset') offset = q.value;
        });
        const page = Math.floor(offset / limit) + 1;
        const params = new URLSearchParams({
            per_page: String(limit),
            page: String(page),
        });
        const json = await apiFetch(`/api/public/${resource}?${params.toString()}`);
        const documents = (json.data || []).map(wrapDoc);
        return {
            documents,
            total: json.total ?? documents.length,
        };
    }

    async createDocument(_db, resource, _id, data) {
        const json = await apiFetch(`/api/public/${resource}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return wrapDoc(json.data || json);
    }
}

export const Query = {
    limit: (n) => ({ _q: 'limit', value: n }),
    offset: (n) => ({ _q: 'offset', value: n }),
};

export const ID = {
    unique: () => null, // backend kent zelf ID's toe
};
