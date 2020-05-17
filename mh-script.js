// ==UserScript==
// @name         Mug Hunter
// @namespace    https://greasyfork.org
// @version      0.2
// @description  try to take over the world!
// @author       You
// @match        *.torn.com/page.php?sid=UserList*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_getResourceText
// @require      https://cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js
// @resource     dataTablesStyles https://cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css
// @require      file://D:\git\pushee\mug-hunter\mh-script.js
// ==/UserScript==


// Initializing a class definition
class Player {

    constructor(rawPlayer) {
        this._id = id;
        this._name = null;
        this._age = null;
        this._rank = null;
        this._lastOnline = null;
        this._status = null;
        this._networth = null;
        this._losses = null;
        this._job = rawPlayer.job;
    }

    enrich(callback) {
        $.ajax(`https://api.torn.com/user/${this._id}?selections=profile,personalstats&key=${opts.settings.apiKey}`)
            .success(data => {
                this._name = data.name;
                this._age = data.age;
                this._rank = data.rank.toLowerCase();
                this._lastOnline = data.last_action.timestamp;
                this._status = data.status.state.toLowerCase();
                this._networth = data.personalstats.networth;
                this._losses = data.personalstats.defendslost;
            })
    }
    
}

class Counter {

    constructor(limit, expiresIn) {
        this._stack = [];
        this._limit = limit;
        this._expiresIn = expiresIn;
    }

    // add item to stack
    push() {
        this.getStack().push(new Date().getTime());
        this.filterStack();
    }
    
    hasCapacity(intention = 0) {
        return (this.getStack().length + intention) < this.getLimit();
    }

    // purge old items
    filterStack() {
        this.setStack( this.getStack().filter(x => {
            return ((new Date().getTime() - x) / 1000) < this.getExpiresIn()
        }));

        // reccur until items are gone (lenght is 0) 
        if (this.getStack().length > 0) {
            setTimeout(() => this.filterStack(), 1000);
        }
    }
    
    // getters and setters
    getLimit() { return this._limit; }
    setLimit(limit) { this._limit = limit; }
    getExpiresIn() { return this._expiresIn; }
    setExpiresIn(expiresIn) { this._expiresIn = expiresIn; }
    getStack() { return this._stack; }
    setStack(stack) { this._stack = stack; }
}


let   DEBUG_ON = false;
const PREFS_KEY = "storedPrefs";
const PLAYERS_KEY = "storedPlayers";
let   dataTable = null;
let   callCounter = new Counter(80, 60);

let log = function(text, override = false) {
    if (DEBUG_ON || override) console.log(text);
}

function jsonCopy(src) {
    return JSON.parse(JSON.stringify(src));
}

class Preferences {
    constructor(obj = {}) {

        if (obj.hasOwnProperty('filters')) {
            this.filters = jsonCopy(obj.filters);
        } else { 
            this.filters = {
                jobs: {
                    enabled: true,
                    values: ['Surgeon', 'Principal', 'Federal']
                },
                networth: {
                    enabled: true,
                    value: 10000000
                },
                ranks: {
                    enabled: true,
                    values: ['Investor', 'Deserter']
                },
                lastOnline: {
                    enabled: true,
                    value: 1000
                },
                losses: {
                    enabled: true,
                    value: 100
                },
                state: {
                    enabled: true,
                    values: ['Abroad', 'Travelling']
                }
            }
        };
        
        if (obj.hasOwnProperty('settings')) {
            this.settings = jsonCopy(obj.settings);
        } else { 
            this.settings = {
                apiKey: '8A0zcTJNoxOuswqd',
                scan: false
            }
        };
    }
}

let opts = new Preferences();
let players = new Array();

let formatCurrency = function(num){
    var str = num.toString().replace("$", ""), parts = false, output = [], i = 1, formatted = null;
    if(str.indexOf(".") > 0) {
        parts = str.split(".");
        str = parts[0];
    }
    str = str.split("").reverse();
    for(var j = 0, len = str.length; j < len; j++) {
        if(str[j] != ",") {
            output.push(str[j]);
            if(i%3 == 0 && j < (len - 1)) {
                output.push(",");
            }
            i++;
        }
    }
    formatted = output.reverse().join("");
    return("$" + formatted + ((parts) ? "." + parts[1].substr(0, 2) : ""));
};


let doScan = function() {
    if (opts.settings.scan) {
        $('.pagination-wrap').first().find('a').last().click()
    }
}

let loadPlayers = function() {
    players = GM_getValue(PLAYERS_KEY, []);
    document.players = players;
}

let savePlayers = function() {
    GM_setValue(PLAYERS_KEY, players)
}

let loadOpts = function() {

    let loadedOpts = GM_getValue(PREFS_KEY, {});

    log('loaded opts');
    log(loadedOpts);

    if (loadedOpts.hasOwnProperty("filters")) {

        log('opts are good, using loaded opts');
        opts =  loadedOpts;

    }

}

let saveOpts = function() {
    log('Saving opts');

    opts.filters = {
        jobs: {
            enabled: $('#mh-filterJob').val() !== null,
            values: $('#mh-filterJob').val()
        },
        networth: {
            enabled: $('#mh-filterNetworth').val() !== '',
            value: $('#mh-filterNetworth').val()
        },
        ranks: {
            enabled: $('#mh-filterRank').val()  !== null,
            values: $('#mh-filterRank').val()
        },
        lastOnline: {
            enabled: $('#mh-filterLastOnline').val() !== '',
            value: $('#mh-filterLastOnline').val()
        },
        losses: {
            enabled: $('#mh-filterLosses').val() !== '',
            value: $('#mh-filterLosses').val()
        },
        state: {
            enabled: true,
            values: ['Abroad', 'Travelling']
        }
    }

    opts.settings = {
        apiKey: $('#mh-apiKey').val(),
        scan: $('#mh-filterScan').attr('checked') == 'checked'
    }

    GM_setValue(PREFS_KEY, opts)
    loadOpts();
}

let drawPlayers = function() {

    log('draw players');
    dataTable.clear().draw();
    
    players.forEach( x => {
        dataTable.row.add(x)
    })

    dataTable.draw();

}


let preEnrichFilter = function(list) {

    let filterJob = function(rawPlayer) {
        if (opts.filters.jobs.enabled) {
            try {

                rawPlayer.job = $(rawPlayer.IconsList)
                    .find("li.iconShow[title*='Job']")
                    .prop('title')
                        .replace(/(<\/?b>)/g, '')
                        .replace(/(<\/?br>)/g, '')
                        .replace(/( at the).*$/g, '')
                        .replace(/( in the).*$/g, '')
                        .replace('Job', '')

                return opts.filters.jobs.values.findIndex(test => rawPlayer.job.toLowerCase().indexOf(test.toLowerCase()) >= 0) >= 0;
                
            } catch(ex) {
                return false;
            }   
        } else {
            return true
        }
    }

    return list.filter(filterJob);

};

let postEnrichFilter = function(list) {

    let filterState = function(player) {
        if (opts.filters.state.enabled) {
            try {
                return !(opts.filters.state.values.findIndex(test => player.status.toLowerCase().indexOf(test.toLowerCase()) >= 0) >= 0);
            } catch(ex) {
                return false;
            }   
        } else {
            return true;
        }
    }

    let filterRank = function(player) {
        if (opts.filters.ranks.enabled) {
            try {
                return opts.filters.ranks.values.findIndex(test => player.rank.indexOf(test) >= 0) >= 0;
            } catch(ex) {
                return false;
            }   
        } else {
            return true;
        }
    }
    
    let filterNetworth = function(player) {
        if (opts.filters.networth.enabled) {
            try {
                return opts.filters.networth.value <= player.networth;
            } catch(ex) {
                return false;
            }   
        } else {
            return true;
        }
    }
    
    let filterLosses = function(player) {
        if (opts.filters.losses.enabled) {
            try {
                return opts.filters.losses.value >= player.losses;
            } catch(ex) {
                return false;
            }   
        } else {
            return true;
        }
    }
    
    let filterActivity = function(player) {
        if (opts.filters.lastOnline.enabled) {
            try {
                return opts.filters.lastOnline.value <= player.lastOnline;
            } catch(ex) {
                return false;
            }   
        } else {
            return true;
        }
    }

    return list
        .filter(filterRank)
        .filter(filterLosses)
        .filter(filterNetworth)
        .filter(filterActivity)
        .filter(filterState);

};


let addPlayer = function(player) {

    let index = players.findIndex(p => p.id === player.id);
    if (index >= 0) {
        players[index] = jsonCopy(player);
    } else {
        players.push(player);
    }

}


let processPlayers = function(rawList) {

    let processedList = [];
    let deferredList = [];

    rawList = preEnrichFilter(rawList);

    // check if we can perform required api calls given current stack
    if (!callCounter.hasCapacity(rawList.length)) {
        
        log('api limit reached! waiting for drain', true);
        setTimeout( () => {
            processPlayers(rawList)
        },  10000);
        return false;

    }

    // loop through user items
    rawList.forEach(rawPlayer => { 
        deferredList.push(enrichPlayer(rawPlayer))
        callCounter.push();
    })
    
    $.when(...deferredList).then(function(...respArray) {

        respArray.forEach( resp => {

            try {

                if (Array.isArray(resp) && resp[0].hasOwnProperty('player')) {
                    processedList.push(resp[0].player);
                } else if (resp.hasOwnProperty('player')) {
                    processedList.push(resp.player);
                } else {
                    return false;
                }

            } catch (ex) {
                log(ex, true);
            }

        })
        
        log(`processedList after enrichment: ${JSON.stringify(processedList)}`);

        // remove unwanteds
        processedList = postEnrichFilter(processedList);
        log(`processedList after filtering: ${JSON.stringify(processedList)}`);

        // save
        processedList.forEach(addPlayer);
        log(`processedList: ${JSON.stringify(processedList)}`);

        // save
        savePlayers();

        // 
        drawPlayers();

        // scan next
        doScan();

    })
    
};

let init = function() {
    log("Init muggotron");

    // inject styles
    addStyles();

    // get opts
    loadOpts();
    
    // load players
    loadPlayers();

    //draw ui
    drawUI();

    drawPlayers();

    // piggyback off ajax completion events, check that it is for this page
    $( document ).ajaxComplete(function(event, resp, params) {
        try {
            if (resp.status == 200) {
                if (params.url.indexOf('https://www.torn.com/page.php') == 0) {
                    processPlayers(JSON.parse(resp.responseText).list);
                }
            } else {
                throw `Get players status != 200 [actual ${resp.status}]`
            }
        } catch (ex) {
            log(ex, true);
            log(event, true);
            log(resp, true);
            log(params, true);
        }
    });
};


// inject styles
// attach event listener to document ready
$(document).ready(function () {
    'use strict';
    log($.fn.jquery, true)
    init();
})