const USER_MAP = {
  "natalia@spa-company.com": "user-504",
  "denis@spa-company.com": "user-505",
  "nuttha@spa-company.com": "user-506",
  "nonthawat@spa-company.com": "user-507",
  "lubo@spa-company.com": "user-508",
  "radka@spa-company.com": "user-509",
  "lucy@spa-company.com": "user-510",
  "anisha@spa-company.com": "user-511",
  "sitanan@spa-company.com": "user-512",
  "bow@spa-company.com": "user-513",
  "dadda@spa-company.com": "user-514",
  "dagmar@spa-company.com": "user-515",
  "lanicha@spa-company.com": "user-516",
  "michal@spa-company.com": "user-345",
  "coordinator@spa-company.com": "user-517",
  "phung@spa-company.com": "user-518",
  "andreag@spa-company.com": "user-519",
  "payroll@spa-company.com": "user-520",
  "daniela@spa-company.com": "user-521",
  "alzbeta@spa-company.com": "user-522",
  "andrea@spa-company.com": "user-523",
  "petr@spa-company.com": "user-524",
  "jakub@dmjeurope.com": "user-529",
  "anna@dmjeurope.com": "user-530",
};

export function getNotionUserId(email) {
  return USER_MAP[email?.toLowerCase()] || null;
}
