#!/bin/bash
REMOTO=$1
# echo $REMOTO
if [ -z $REMOTO ]; then
	URL=http://admin:admin@localhost:5984/
	echo "USANDO LOCAL"
else
	echo "USANDO IBM"
	URL=https://48ca1e0f-7361-4586-9aca-4f982ef8c52d-bluemix:5a9ebc63cc1f683ebb8f47b483570aeb7142a7035bd712a2ea55b1a138c5e2bd@48ca1e0f-7361-4586-9aca-4f982ef8c52d-bluemix.cloudant.com/
fi;
# echo $URL

# exit 2
for i in `echo "chatlog"; echo "data";echo "schedule_logs"; echo "users"; echo "general_log";`
do 
echo ${URL}
curl -w "http_code: %{http_code}\n" -X DELETE ${URL}$i
done

exit;
/*
{
  "_id": "09453b50-d6bb-11e7-9971-2da874d2d43b",
  "_rev": "24-627a999fd686e02c86848fa5589c1c87",
  "schedule": {
    "on": false,
    "task": "syncCourses9",
    "beginDate": 1512432000000,
    "status": "success",
    "interval": {
      "value": 5
    },
    "error": "",
    "lastExec": 1512151680000
  },
  "name": "TESTE Teste334",
  "type": "parameter"
}
*/