// agendador
/*
dow=d.getDay();
(sunday)0,1,2,3,4,5,6

dom=d.getDate();

min=d.getMinutes();
hou=d.getHours();
*/

const uuidv1=require('uuid/v1');


/**
 * apenas p/ centralizar o processo de log
 */
function consoleLog1(msg,msg2) {
    // return true;
    if(msg2 != undefined) {
        console.log(msg,msg2);
    } else {
        console.log(msg);
    }
}






class Schedule {
    /*  
        docNative: documento do banco; p/ fazer updates
        beginDate=Date || epoch,
        endDate=Date || epoch,
        daysOfWeek=[];
        daysOfMonth=[];
        minutes=[];
        months=[];
        hours=[];
        status:(string) ('running'|'success'|'fail'|'')
        interval={
            unit:'', //(string) {min|hour|day}
            value:0,
            cond:[{hour:null,min:null},{hour:null,min:null}]
        } 
        lastExec: UTC epoch;
        task:"" // nome da func a ser executada; DEVE retornar um Promise
    */

    constructor(result,params) {
        if(!params) params={}
        const isInsert=params.isInsert;


        var schedule=result.schedule;
        this.docNative=result || null;
        /*
            EXEMPLO DE docNative
            { _id: 'e163d21160d0ed307942f4611237a3a5',
            _rev: '61-ad762a055b850539539ce4083997ca7e',
            name: 'teste1 - essa prop não é obrigatória, roda a cada 5 min',
            type: 'parameter',
            schedule: {
                    task: 'task1',
                    status: '',
                    interval: { value: 2 },
                    lastExec: 1511292540000
                }
            }
        */
        // consoleLog1('######################## DOC NATIVE #####################');
        // consoleLog1(this.docNative);
        // consoleLog1('######################## DOC NATIVE #####################');
        if(schedule) {
            this.daysOfWeek=schedule.daysOfWeek || null;
            this.daysOfMonth=schedule.daysOfMonth || null;
            this.months=schedule.months || null;
            this.minutes=schedule.minutes || null;
            this.hours=schedule.hours || null;
            this.status=schedule.status || '';
            this.beginDate=schedule.beginDate || null;
            this.endDate=schedule.endDate || null;
            this.interval=schedule.interval || null;
            this.lastExec=schedule.lastExec || null;
            this.task=schedule.task || null;
            this.on=schedule.on ? true : false;
        }
        this.verifier({isInsert});

        if(!Date.prototype.formatBr) {
            Date.prototype.formatBr=function() {
                var str=this.getUTCDate()+'/'+(this.getUTCMonth()+1)+'/'+this.getUTCFullYear()+' '+this.getUTCHours()+':'+this.getUTCMinutes()+':'+this.getUTCSeconds();
                return str;
            }
        }

    }

    verifier(params) {
        if(!params) params={}
        const isInsert=params.isInsert; // verificação p/ inserção...
        function verArray(arr,prop) {
            if(!arr) {
                return true;
            }
            try {
                arr.forEach(elem=>{
                    if(!parseInt(elem) && parseInt(elem)!==0) {
                        throw new Error(elem);
                    }
                });
            } catch(e) {
                throw new Error(`O parâmetro "${prop}" deve ser uma array de integers!`);
            }

        } // verArray
        verArray(this.daysOfWeek,'daysOfWeek');
        verArray(this.daysOfMonth,'daysOfMonth');
        verArray(this.minutes,'minutes');
        verArray(this.hours,'hours');

        var arrDateType=['beginDate','endDate'];
        arrDateType.forEach(elem=>{
            const elem2=this[elem];
            if(elem2 && (! elem2 instanceof Date || ! parseInt(elem2))) {
                throw new Error(`A propriedade ${elem} deve ser do tipo "Date" ou integer(epoch)`);
            }
        });

        // task
        if(!this.task) {
            throw new Error(`A propriedade "task" não pode ser vazia!`);
        }

        if(!isInsert) {
            var onlyDate=['beginDate','endDate'];
            onlyDate.forEach(elem=>{
                if(this[elem]) {
                    if(typeof this[elem] === 'number') {
                        this[elem]=new Date(this[elem]);
                    }
                    this[elem].setUTCHours(0,0,0,0);
                }
            });
            if(this.endDate)
                this.endDate.setUTCHours(23,59,59,999);
        }

        // verificando a prop. interval
        if(this.interval) {
            /*
                interval={
                    unit:'', //(string) {min}
                    value:0,
                    cond:[{hour:null,min:null},{hour:null,min:null}]
                }
            */
            if(this.interval.unit && typeof this.interval.unit != 'string') {
                throw new Error(`O parâmetro "unit" deve ser uma string`);
            }
            if(this.interval.value && typeof this.interval.value != 'number') {
                if(isNaN(parseInt(this.interval.value)))
                    throw new Error(`O parâmetro "value" deve ser numérico`);
            }

            if(this.interval.cond) {
                if((! Array.isArray(this.interval.cond) || this.interval.cond.length != 2)) {
                    throw new Error(`O parâmetro "cond" deve ser array com 2 itens`);
                }
                if(!parseInt(this.interval.cond[0].hour) || ! parseInt(this.interval.cond[0].min)) {
                    throw new Error(`Primeiro parâmetro da condição de intervalo inválido! hour: ${this.interval.cond[0].hour}; min: ${this.interval.cond[0].min}`);
                }
                if(!parseInt(this.interval.cond[1].hour) || ! parseInt(this.interval.cond[1].min)) {
                    throw new Error(`Segundo parâmetro da condição de intervalo inválido! hour: ${this.interval.cond[1].hour}; min: ${this.interval.cond[1].min}`);
                }
            }
        }

    } // verifier




    run(params) {
        if(!params) params={};
        // const cb=params.cb;
        const now=params.now || new Date();
        const objDate=this.getDateObj(now);

        // DATA INÍCIO
        if(this.beginDate && this.beginDate > now) {
            consoleLog1(`ERROR: beginDate - agendado: ${this.beginDate.formatBr()}; atual: ${now.formatBr()}`);
            return false;
        }
        // DATA FIM
        if(this.endDate && this.endDate < now) {
            consoleLog1(`ERROR: endDate - agendado: ${this.endDate.formatBr()} ; atual: ${now}`);
            return false;
        }

        if(this.status === 'running') {
            consoleLog1(`ERROR: tarefa ainda em execução!`);
            return false;
        }

        // OU usamos this.interval... ou agendador tipo "crontab"
        if(this.interval) {
            const unit=this.interval.unit || 'min';
            const multiply = unit == 'min' ? 60 : (60*60);
            const value=this.interval.value;
            const lastExec=this.lastExec; // epoch milliseconds
            const compensacao=20000;
            var value2=(value*multiply)*1000;
            value2+=(lastExec-compensacao);
            // value2=[(value2-variacao),(value2+variacao)];
            const time=now.getTime();
            // if(!(time > value2[0] && time < value2[1]) && lastExec) {
            if(!(time > value2) && lastExec) {
                consoleLog1(`lastExec: ${this.lastExec}`);
                consoleLog1(value2);
                consoleLog1(time);
                consoleLog1(`ERROR: tarefa fora do intervalo. Intervalo: ${value}`);
                return false;
            }

            if(this.interval.cond) {
                const startHour=this.interval.cond[0].hour;
                const startMinute=this.interval.cond[0].min;
                const startObj=new Date(now.getTime());
                startObj.setHours(startHour,startMinute);
                const endHour=this.interval.cond[1].hour;
                const endMinute=this.interval.cond[1].min;
                endObj.setHours(endHour,endMinute);

                if(!(now > startObj && now < endObj)) {
                    consoleLog1(`ERROR: intervalo fora da condição estabelecida: intervalo:${value} -- condicao de-ate: ${startObj.formatBr()} - ${endObj.formatBr()}`);
                    return false;
                }
            }
        
        } else {
            // aqui escolhemos usar agendador tipo "crontab" ao invés do parâmetro "interval"

            // DIA DA SEMANA
            if(this.daysOfWeek && this.daysOfWeek.indexOf(objDate.dayOfWeek) === -1) {
                consoleLog1(`ERROR: day of week - agendado: ${this.daysOfWeek.join(',')} ; atual: ${objDate.dayOfWeek}`);
                return false;
            }
            // DIA DO MES
            if(this.daysOfMonth && this.daysOfMonth.indexOf(objDate.dayOfMonth) === -1) {
                consoleLog1(`ERROR: day of Month - agendado: ${this.daysOfMonth.join(',')} ; atual: ${objDate.dayOfMonth}`);
                return false;
            }
            // MES
            if(this.months && this.months.indexOf(objDate.month) === -1) {
                consoleLog1(`ERROR: Month - agendado: ${this.months.join(',')} ; atual: ${objDate.month}`);
                return false;
            }
            // HORA
            if(this.hours && this.hours.indexOf(objDate.hour) === -1) {
                consoleLog1(`ERROR: Hours - agendado: ${this.hours.join(',')} ; atual: ${objDate.hour}`);
                return false;
            }
            // MINUTO
            if(this.minutes && this.minutes.indexOf(objDate.minute) === -1) {
                consoleLog1(`ERROR: Minutes - agendado: ${this.minutes.join(',')} ; atual: ${objDate.minute}`);
                return false;
            }
        }
        /* não vamos chamar cb aqui;
        if(cb) {
            return cb();
        } */

        return {
            status:true,
            /* setRunningStatus:(params)=>{
                const db=params.db;
                // antes de iniciarmos a execução da tarefa, setamos p/ 'running'
                return new Promise((res,rej)=>{
    
                    var toSave=this.docNative;
                    toSave.schedule.status='running';
                    return db.insert(toSave,(err,body)=>{
                        if(err) {
                            return rej(err);
                        }
                        // quando salvar com sucesso, precisamos re-setar o rev

                            // SCHEDULE.STDOUT ######### retorno salvo do setRunningStatus { ok: true,
                            // id: 'e163d21160d0ed307942f4611237a3a5',
                            // rev: '73-f87b77c9d2856555319d75d1d5fcab9f' }

                        this.docNative._rev=body.rev;
                        // consoleLog1('######### retorno salvo do setRunningStatus',body);
                        return res({ok:true});
                    });
    
                });
            }, */
            /* saveExec:(params)=>{
                // essa func será executada após a task ter sido concluída;
                // now2: obj Date a ser criado no momento em que a tarefa terminar;
                var now2=params.now2;
                var db=params.db;
                var status=params.status;
                now2.setSeconds(0,0);
                this.lastExec=now2.getTime(); // epoch do término da tarefa;
                return new Promise((res,rej)=>{

                    var toSave=this.docNative;
                    toSave.schedule.lastExec=this.lastExec;
                    toSave.schedule.status=status;
                    return db.insert(toSave,(err,body)=>{
                        if(err) {
                            return rej(err);
                        }
                        return res({ok:true});
                    });

                });
            }, */
            saveLog:(params)=>{
                // salvar log dessa execução;
                var task=this.task;
                var msgScheduleLog=params.msgScheduleLog;
                var status=params.scheduleStatus ? params.scheduleStatus : params.status;
                var msg=params.msg;
                var beginTime=now.getTime(); // epoch do inicio da tarefa;
                var endTime=params.endTime.getTime(); // epoch do término da tarefa;
                var dbLog=params.dbLog; // obj db já apontado para a db de log;
                var _id=uuidv1();
                var toSave={msg,beginTime,endTime,task,_id,msgScheduleLog,status};
                return new Promise((res,rej)=>{
                    return dbLog.insert(toSave,function(err,body) {
                        if(err)
                            return rej(err);
                        
                        return res({ok:true});
                    });
                });
            }
        };
    }

    getDateObj(date) {
        if(!date) date=new Date();
        var obj={
            dayOfWeek:date.getDay(),
            dayOfMonth:date.getDate(),
            month:date.getMonth(),
            minute:date.getMinutes(),
            hour:date.getHours()
        }
        return obj;
    }




    /**
     * retorna um JSON representando o agendamento (p/ display)
     */
    toLoad() {
        const native=this.docNative;
        const retObj={
            schedule:{

                daysOfWeek:this.daysOfWeek,
                daysOfMonth:this.daysOfMonth,
                months:this.months,
                minutes:this.minutes,
                hours:this.hours,
                status:this.status,
                beginDate:this.beginDate,
                endDate:this.endDate,
                interval:this.interval,
                lastExec:this.lastExec,
                task:this.task,
                on:this.on
            },
            type:native.type,
            name:native.name,
            description:native.description,
            _id:native._id,
            _rev:native._rev
        }

        return retObj;
    }

}

module.exports=Schedule;