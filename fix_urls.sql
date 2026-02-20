UPDATE order_files
SET
  "thumbnailUrl" = REPLACE("thumbnailUrl", E'\xEB\xA1\x9C\xEC\x95\xA4\xEC\xBD\x94\xEC\xBD\x94', '%EB%A1%9C%EC%95%A4%EC%BD%94%EC%BD%94'),
  "fileUrl" = REPLACE("fileUrl", E'\xEB\xA1\x9C\xEC\x95\xA4\xEC\xBD\x94\xEC\xBD\x94', '%EB%A1%9C%EC%95%A4%EC%BD%94%EC%BD%94')
WHERE "thumbnailUrl" LIKE '%/uploads/orders/%'
  AND ("thumbnailUrl" SIMILAR TO '%[^[:ascii:]]%' OR "fileUrl" SIMILAR TO '%[^[:ascii:]]%');
