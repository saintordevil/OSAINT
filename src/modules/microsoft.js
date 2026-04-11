// Microsoft SharePoint/OneDrive personal link parser
// Extracts the encoded email address from the URL path
// No HTTP request needed - pure URL string parsing

export default async function microsoft(url) {
    try {
        const match = url.match(/personal\/([\w_]+)\//i);
        if (!match) return { error: 'Could not extract identity from SharePoint URL' };

        const encoded = match[1];
        const parts = encoded.split('_');

        if (parts.length < 3) return { error: 'Encoded segment too short to parse' };

        // Last part = TLD, second-to-last = domain, rest = name parts
        const tld = parts[parts.length - 1];
        const domain = parts[parts.length - 2];
        const nameParts = parts.slice(0, parts.length - 2);

        const email = `${nameParts.join('.')}@${domain}.${tld}`;

        return { data: { email } };
    } catch (err) {
        return { error: err.message };
    }
}
