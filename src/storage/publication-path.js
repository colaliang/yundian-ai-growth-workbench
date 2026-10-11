import { crmFamilies } from "../crm/validation.js";
// Known records have one exact directory and one canonical JSON filename.
export const publicationFamilies = ['content-items', 'publish-confirmations', 'publish-attempts', ...crmFamilies];
export function validatePublicationPath(relative) {
    const parts = relative.split('/'), family = parts[1]?.toLowerCase();
    if (parts[0].toLowerCase() !== 'growth-workspace' || !publicationFamilies.includes(family))
        return;
    const pattern = crmFamilies.includes(family) ? /^[a-f0-9]{32}\.json$/ : /^\w[\w-]{0,127}\.json$/;
    if (parts[0] !== 'growth-workspace' || parts[1] !== family || parts.length > 3 || parts.length === 3 && !pattern.test(parts[2]))
        throw Error('Noncanonical structured record path');
}
