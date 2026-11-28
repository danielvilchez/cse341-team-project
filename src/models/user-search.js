const normalizeSearchText = (value) => value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

const userSearchValues = ({ name, username, email }) => [
    normalizeSearchText(name),
    normalizeSearchText(username.trim()),
    normalizeSearchText(email)
];

const parseUserSearch = (value) => {
    const search = value.trim();
    if (!search || search === '""') {
        return [];
    }

    let terms;
    if (search.startsWith('"') && search.endsWith('"') && search.length > 1) {
        const phrase = search.slice(1, -1);
        if (phrase.includes('"')) return null;
        if (!phrase.trim()) return [];
        terms = [phrase];
    } else {
        if (search.includes('"')) return null;
        terms = search.split(/\s+/);
    }

    const normalized = terms.map(normalizeSearchText);
    return normalized.some((term) => !term) ? null : normalized;
};

export { normalizeSearchText, parseUserSearch, userSearchValues };
