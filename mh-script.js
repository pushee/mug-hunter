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
// @Require      file://D:\git\pushee\mug-hunter\mh-script.js
// ==/UserScript==

const DEBUG_ON = true;
const PREFS_KEY = "storedPrefs";
const PLAYERS_KEY = "storedPlayers";

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
let players = [];

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

let loadPlayers = function() {
    players = GM_getValue(PLAYERS_KEY, []);
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
        return loadedOpts;

    } else {

        log('opts are not good, using defaults');
        return opts;

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
        }
    }

    opts.settings = {
        apiKey: $('#mh-apiKey').val(),
        scan: $('#mh-filterScan').attr('checked') == 'checked'
    }

    GM_setValue(PREFS_KEY, opts)

}

let injectUI = function() {

    let bar = $(`
    <div class="mh-wrapper">
        <div class="mh-title-bar title-black top-round m-top10">
            <span class="mh-border-right">MugHunter</span>
            <div class="mh-toggleSettings right"></div>
        </div>
        <div class="mh-filterbar bottom-round cont-gray">
            <div class="mh-filterTitle">
                Filter options
            </div>

            <div class="mh-filterGroup">
                <label for="mh-filterJob">Job filter</label>
                <select multiple="" class="form-control" id="mh-filterJob">
                    <option>Surgeon</option>
                    <option>Principal</option>
                    <option>Federal</option>
                    <option>General</option>
                    <option>Manager</option>
                    <option>President</option>
                </select>
            </div>

            <div class="mh-filterGroup">
                <label for="mh-filterRank">Rank filter</label>
                <select multiple="" class="form-control" id="mh-filterRank">
                    <option>Investor</option>
                    <option>Hoarder</option>
                    <option>Tycoon</option>
                </select>
            </div>

            <div class="mh-filterGroup">
                <label for="mh-filterScan">Loss threshold</label> 
                <input type="textbox" id="mh-filterLosses" value="${opts.filters.losses.value}" />
            </div>

            <div class="mh-filterGroup">
                <label for="mh-filterScan">Activity threshold</label>
                <input type="textbox" id="mh-filterLastOnline" value="${opts.filters.lastOnline.value}" />
            </div>

            <div class="mh-filterGroup">
                <label for="mh-filterNetworth">Networth threshold</label>
                <input type="textbox" id="mh-filterNetworth" value="${opts.filters.networth.value}" />
            </div>

            <div class="mh-filterTitle">
                Processing options
            </div>

            <div class="mh-filterGroup">
                <label for="mh-apiKey">API Key</label>
                <input type="textbox" id="mh-apiKey" value="${opts.settings.apiKey}" />
            </div>

            <div class="mh-filterGroup">
                <label for="mh-filterScan">Scan</label>
                <input type="checkbox" id="mh-filterScan" name="mh-filterScan" ${opts.settings.scan ? 'checked="checked"' : ''} />
            </div>

            <div class="mh-filterTitle">
                Spoopy
            </div>

            <div class="mh-filterGroup">
                <label for="mh-reset"></label>
                <button id="mh-reset">RESET</button>
            </div>
        </div>
    </div>`)

    bar.find('#mh-filterJob').val(opts.filters.jobs.values)
    bar.find('#mh-filterRank').val(opts.filters.ranks.values)
    bar.find('.mh-toggleSettings').click(() => $('.mh-filterbar').toggle());
    bar.find('#mh-reset').click(() => {

        log('RESET', true);
        GM_setValue(PREFS_KEY, new Preferences())
    });
    
    $(bar).find('input, select').change(() => {
        saveOpts();
        if (opts.settings.scan) {
            $('.pagination-wrap').first().find('a').last().click()
        }
    });
    
    bar.insertBefore('.userlist-wrapper');

};

let addStyles = function() {
    GM_addStyle(`

.mh-filterbar {
    height: auto!important;
}

.pagination-wrap {
    visibility: hidden;
}

.mh-toggleSettings {
    margin-right: 10px;
    border: 2px solid #575757;
    width: 1em;
    height: 1em;
    margin-top: 0.5em;
    border-radius: 1em;
    background-color: #169ee4;
    cursor: pointer;
}

.mh-toggleSettings:hover {
    background-color: #56adda;
    
}

mh-toggleSettings span {
    position: relative;
    top: -10px;
}

.mh-filterbar.bottom-round.cont-gray {
    padding: 10px;
}

.mh-filterTitle {
    background-color: #ccc;
    border-bottom: 3px solid #ddd;
    border-radius: 2px;
    padding: 6px;
    font-weight: 600;
    margin-bottom: 10px;
}

.mh-filterGroup {
    margin-bottom: 10px;
    vertical-align: top;
}

.mh-filterGroup label {
    line-height: 1.5em;
    width: 140px;
    display: inline-block;
    text-align: right;
    margin-right: 10px;
    vertical-align: text-top;
    padding: 1px;
}

.mh-filterGroup input[type=textbox] {
    border: 1px solid #666;
    padding-left: 6px;
    width: 200px;
    line-height: 1.5em;
    vertical-align: text-top;
    border-radius: 2px;
}

.mh-filterGroup input[type=checkbox] {
    top: 4px;
    position: relative;
}

.mh-filterGroup select {
    border: 1px solid #666;
    padding-left: 6px;
    width: 200px;
    line-height: 1.5em;
    vertical-align: text-top;
    border-radius: 2px;
}

@media only screen and (max-width: 1000px) {

    .mh-filterbar {
    padding: 4px;
    }

    li.mh-data {
        padding-left: 6px;
    }

    .mh-filterbar span {
        padding: 2px;
        display: block;
        width: 90%;
        line-height: 1.8em!important;
    }

    .mh-border-right {
        border-right: 0px solid #ccc;
        border-bottom: 2px solid #ccc;
        margin-bottom: 3px;
    }

}

    `);
};

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

                return opts.filters.jobs.values.findIndex(test => rawPlayer.job.indexOf(test) >= 0) >= 0;
                
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

    return list
        .filter(filterRank)
        .filter(filterLosses)
        .filter(filterNetworth);

};


let addPlayer = function(player) {

    let index = players.findIndex(p => p.id === player.id);
    if (index >= 0) {
        players[index] = jsonCopy(player);
    } else {
        players.push(player);
    }

}


let enrichPlayer = function(rawPLayer) {
    return $.ajax('https://api.torn.com/user/' + rawPLayer.userID + '?selections=profile,personalstats&key=' + opts.settings.apiKey)
            .success(data => {
                data.player = {
                    name: data.name,
                    age: data.age,
                    id: data.player_id,
                    rank: data.rank.toLowerCase(),
                    lastOnline: data.last_action.timestamp,
                    status: data.status.state.toLowerCase(),
                    networth: data.personalstats.networth,
                    losses: data.personalstats.defendslost,
                    job: rawPLayer.job,
                    timestamp: Math.floor(new Date().getTime()/1000)
                }
            })
}

let processPlayers = function(rawList) {

    let processedList = [];
    let deferredList = [];

    rawList = preEnrichFilter(rawList);

    // loop through user items
    rawList.forEach(rawPlayer => {deferredList.push(enrichPlayer(this))})
    
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
        
        // remove unwanteds
        processedList = postEnrichFilter(processedList);

        // save
        processedList.forEach(addPlayer);
        
        // save
        savePlayers();

        //log it out
        log(players, true);

        if (opts.settings.scan) {
            setTimeout(
                function() {
                    log('click!');
                    $('.pagination-wrap').first().find('a').last().click()
                }, Math.floor(Math.random() * Math.floor(4000)) + 2000
            )
        }

    })
    
};

let init = function() {
    log("Init muggotron");

    // inject styles
    addStyles();

    // get opts
    opts = loadOpts();

    // inject filter bar
    injectUI();

    // load players
    loadPlayers();

    // piggyback off ajax completion events, check that it is for this page
    $( document ).ajaxComplete(function(event, resp, params) {
        if (params.url.indexOf('https://www.torn.com/page.php') == 0) {
            processPlayers(JSON.parse(resp.responseText).list);
        }
    });
};


// inject styles
// attach event listener to document ready
$(document).ready(function () {
    'use strict';
    init()
})