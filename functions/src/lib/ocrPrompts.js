export const PASSPORT_PROMPT = `You are analyzing a passport document image/PDF. Extract the following fields and return them as JSON.

Return ONLY valid JSON with these exact keys:
{
  "fullName": "string — full name as printed on passport",
  "firstName": "string — given name(s)",
  "lastName": "string — surname/family name",
  "dateOfBirth": "YYYY-MM-DD or null",
  "placeOfBirth": "string or null",
  "nationality": "string — country name (e.g. 'Thailand', 'Philippines', 'Indonesia')",
  "gender": "Male or Female or null",
  "passportNumber": "string",
  "dateOfIssue": "YYYY-MM-DD or null",
  "dateOfExpiry": "YYYY-MM-DD or null",
  "issuingCountry": "string — country name"
}

Rules:
- For Thai passports, the name may appear in both Thai and English — use the English version.
- For Filipino passports, combine given name + middle name + surname for fullName.
- For Indonesian passports, the name field may be a single field — use it as fullName.
- Dates must be in YYYY-MM-DD format. If only partial date visible, return null.
- If a field is not visible or unreadable, return null for that field.
- Do not guess — only extract what is clearly readable.`;

export const CV_PROMPT = `You are analyzing a CV/Resume document. Extract the following fields and return them as JSON.

Return ONLY valid JSON with these exact keys:
{
  "education": "string — highest education level (e.g. 'High School', 'Bachelor Degree', 'Vocational Certificate') or null",
  "experience": "string — total years of experience summary (e.g. '5 years') or null",
  "skills": ["array of skill strings mentioned in the CV"],
  "workHistory": [
    {
      "role": "string — job title",
      "location": "string — company/place",
      "duration": "string — e.g. '2020-2025' or '3 years'",
      "duties": ["array of duty/responsibility strings"]
    }
  ],
  "email": "string or null — if contact email is visible",
  "phone": "string or null — if contact phone is visible"
}

Rules:
- Extract work history entries in reverse chronological order (most recent first).
- For skills, include both technical skills and soft skills.
- If the CV is in Thai or another language, translate key information to English.
- If a field is not present, return null or empty array as appropriate.
- Do not invent information — only extract what is clearly stated.`;
