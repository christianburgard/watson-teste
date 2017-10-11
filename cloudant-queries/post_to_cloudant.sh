#!/bin/bash

curl -H 'Content-Type: application/json' -X POST http://7cc18bb9-48d9-4988-a975-062ea5a5324d-bluemix:07145c72e3d757654c56b51e488f0e0cdaba18a2be92867a87c37d11d806ff34@7cc18bb9-48d9-4988-a975-062ea5a5324d-bluemix.cloudant.com/users/_index -d $1
