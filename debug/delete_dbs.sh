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
for i in `echo "chatlog"; echo "data"; echo "users"`;
do 
echo ${URL}
curl -X DELETE ${URL}$i
done