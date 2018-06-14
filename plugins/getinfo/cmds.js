var urban       = require('urban'),
    wikipedia   = require('wtf_wikipedia'),
    GetInfo     = require(__dirname + '/func.js'),
    gi          = new GetInfo();

var info = {
    name: 'GetInfo',
    about: 'info from various sources',
    last_word: null,
    c_list: null, //store list of cryptocurrencies
    c_last_rank: 0,
    c_convert: ["AUD", "BRL", "CAD", "CHF", "CLP", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD", "HUF", "IDR", "ILS", "INR", "JPY", "KRW", "MXN", "MYR", "NOK", "NZD", "PHP", "PKR", "PLN", "RUB", "SEK", "SGD", "THB", "TRY", "TWD", "ZAR"]
}
exports.info = info;

if(!config.API.mwdictionary || config.API.mwdictionary.key === '') {
    b.log.warn('Missing Merriam-Webster dictionary API key!');
}

if(!config.API.wolframalpha || config.API.wolframalpha.key === '') {
    b.log.warn('Missing Wolframalpha API key!');
}

var cmds = {
    ud: {
        action: 'get urban dictionary term/word definition',
        params: [{
            optional: function(){ return info.last_word !== null },
            name: 'term',
            type: 'text',
            default: function(){ return info.last_word === null ? undefined : info.last_word; }
        }],
        func: function(CHAN, USER, say, args, command_string){
            info.last_word = args.term;
            var ud = urban(args.term);
            ud.first(function(json) {
                if(json){
                    var str = CHAN.t.highlight('UD ' + CHAN.t.term(args.term) + ': ') + ' ' + c.stripColorsAndStyle(json.definition);
                    if(json.example !== '') str += '\n' + CHAN.t.highlight('e.g. ') + '\u000f' + c.stripColorsAndStyle(json.example);

                    say(str, 1, {url: json.permalink});
                } else {
                    say({err: 'Nothing found'}, 2);
                }
            });
        }
    },
    d: {
        action: 'get Merriam-Webster dictionary word definition',
        params: [{
            optional: function(){ return info.last_word !== null },
            name: 'term',
            type: 'text',
            default: function(){ return info.last_word === null ? undefined : info.last_word; }
        }],
        API: ['mwdictionary'],
        func: function(CHAN, USER, say, args, command_string){
            info.last_word = args.term;
            var word = encodeURI(args.term);
            var url = "http://www.dictionaryapi.com/api/v1/references/collegiate/xml/" + word + "?key=" + config.API.mwdictionary.key;
            x.get_url(url, 'xml', function(data){

                if(!data || !data.entry_list || !data.entry_list.entry){
                    say({err: 'Nothing found'});
                    return;
                }

                try {
                    var str = CHAN.t.highlight('MWD ' + CHAN.t.term(word) + ' ');

                    var def_count = 0;
                    for(var i = 0; i < data.entry_list.entry.length; i++){
                        var entry = data.entry_list.entry[i];
                        if(entry.ew[0] === word){
                            for(var j = 0; j < entry.def.length; j++){
                                var def = entry.def[j];
                                for(var k = 0; k < def.dt.length; k++){
                                    var dt = typeof def.dt[k] === 'string' ? def.dt[k].replace(/^:/, '').trim() : (
                                        typeof def.dt[k]['_'] === 'string' ? def.dt[k]['_'].replace(/^:/, '').trim() : false);

                                    if(dt){
                                        def_count ++;
                                        str += CHAN.t.warn(def_count) + ' ' + dt + ' ';
                                    }
                                }
                            }
                        }
                    }

                    if(def_count === 0){
                        say({err: 'Nothing found'});
                    } else {
                        say(str, 1, {url: 'http://www.merriam-webster.com/dictionary/' + word});
                    }
                } catch(e) {
                    say({err: 'Something went wrong'});
                }
            });
        }
    },
    wiki: {
        action: 'get wikipedia page and summary',
        params: [{
            optional: function(){ return info.last_word !== null },
            name: 'term',
            type: 'text',
            default: function(){ return info.last_word === null ? undefined : info.last_word; }
        }],
        func: function(CHAN, USER, say, args, command_string){
            var pascal = args.term;
            pascal = pascal.toLowerCase().replace(/\b[a-z]/g, function(letter) {
                return letter.toUpperCase();
            });
            args.term = pascal;
            info.last_word = pascal;
            wikipedia.from_api(args.term, "en", function(markup){
                if(markup){
                    var obj = wikipedia.parse(markup);

                    var text = wikipedia.plaintext(markup);

                    if(!text){
                        text = markup.replace(/^==\s/gm, ' \u001f');
                        text = text.replace(/\s==$/gm, '\u000f: ');
                        text = text.replace(/{{.*?}}|\[\[|\]\]|\r\r|\n\n/gm, '');
                    }

                    var str = CHAN.t.highlight('Wiki ' + CHAN.t.term(args.term)) + ' ' + text;

                    say(str, 1, {url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(args.term)});
                } else {
                    say({err: 'Nothing found'});
                }
            });
        }
    },
    wr: {
        action: 'WolframAlpha short answer',
        params: [{
            name: 'question',
            type: 'text'
        }],
        API: ['wolframalpha'],
        func: function(CHAN, USER, say, args, command_string){
            var wolfram = require("wolfram-alpha").createClient(config.API.wolframalpha.key);

            wolfram.query(command_string, function (err, result) {
                if (err){
                    log.error(err);
                    return;
                }

                var answer_arr = [];
                var url = null;
                for(var i = 0; i < result.length; i++){
                    if(result[i].primary === true){
                        for(var j = 0; j < result[i].subpods.length; j++){
                            if(result[i].subpods[j].text !== '' && result[i].subpods[j].text !== '\n') answer_arr.push(result[i].subpods[j].text)
                        }
                    }
                }

                if(answer_arr.length === 0){
                    for(var i = 0; i < result.length; i++){
                        for(var j = 0; j < result[i].subpods.length; j++){
                            if(result[i].subpods[j].text !== '' && result[i].subpods[j].text !== '\n') answer_arr.push(result[i].subpods[j].text)
                            if(result[i].subpods[j].image && result[i].subpods[j].image !== '') url = result[i].subpods[j].image;
                        }
                    }
                }

                if(answer_arr[0] === '(data not available)'){
                    say({err: 'Data not available'});
                } else if(answer_arr.length > 0){
                    var opts = {}
                    if(url != null) opts.url = url;
                    say(answer_arr, 1, opts);
                } else {
                    say({err: 'Nothing found'});
                }
            });
        }
    },
    stock: {
        action: 'get stock info',
        params: [{
            name: 'symbol',
            type: 'string'
        }],
        settings: ['stock/url'],
        func: function(CHAN, USER, say, args, command_string){

          x.get_url(CHAN.config.plugin_settings.stock.url + args.symbol, 'json', function(quote){

                if(quote.err){
                     b.users.get_user_data(args.symbol, {
                        ignore_err: true,
                        skip_say: true,
                        return_nicks: true
                    }, function(d){
                        if(!d) return say({err: 'None found'});

                        db.get_data('/nicks', function(users){
                            if(!users) return say({err: 'None found'});

                            var stats = {
                                total: {
                                    words: 0,
                                    letters: 0,
                                    lines: 0
                                },
                                avr: {
                                    words: 0,
                                    letters: 0,
                                    lines: 0
                                },
                                usr: {
                                    words: 0,
                                    letters: 0,
                                    lines: 0
                                },
                                count: 0
                            };
                            for(var usr in users){
                                if(users[usr].spoke){
                                    stats.count++;

                                    stats.total.words = stats.total.words + (users[usr].spoke.words ? users[usr].spoke.words : 0);
                                    stats.total.letters = stats.total.letters + (users[usr].spoke.letters ? users[usr].spoke.letters : 0);
                                    stats.total.lines = stats.total.lines + (users[usr].spoke.lines ? users[usr].spoke.lines : 0);
                                }
                            }

                            stats.avr.words = stats.total.words / stats.count
                            stats.avr.letters = stats.total.letters / stats.count
                            stats.avr.lines = stats.total.lines / stats.count

                            var symb = d.nick_org;
                            if(d.nick_org.length > 4){
                                symb = symb.replace(/[aeiou]/gi, '');
                                if(symb[0] !== d.nick_org[0]) symb = d.nick_org[0] + symb;

                                if(symb.length > 4){
                                    symb = symb[0] + symb[1] + symb[2] + symb[symb.length - 1];
                                }
                            }

                            if(d.spoke) stats.usr = d.spoke;

                            var perc = ((stats.usr.words - stats.avr.words) / stats.avr.words) * 100;

                            var str = CHAN.t.highlight(d.nick_org) + ' (' + CHAN.t.highlight(symb.toUpperCase()) + ') -> ' + gi.na(CHAN, {value: stats.usr.words});
                            str += ' (' + gi.na(CHAN, {value: stats.usr.words - stats.avr.words}, true) + ' ' + gi.na(CHAN, {value: perc}, true, true) + ')';
                            str += ' | Words Avr: ' + gi.na(CHAN, {value: stats.avr.words});
                            str += ' | Letters U/A: ' + gi.na(CHAN, {value: stats.usr.letters}) + '/' + gi.na(CHAN, {value: stats.avr.letters});
                            str += ' | Lines U/A: ' + gi.na(CHAN, {value: stats.usr.lines}) + '/' + gi.na(CHAN, {value: stats.avr.lines});

                            say(str, 1, {skip_verify: true});
                        
                        });
                    });

                    return;
                }

                var str = CHAN.t.highlight(quote.name) + ' (' + CHAN.t.highlight(quote.symbol.toUpperCase()) + ') -> ' + gi.na(CHAN, quote.price);
                str += ' (' + gi.na(CHAN, quote.change, true) + ' ' + gi.na(CHAN, quote.changepct, true, true) + ')';
                str += ' | DAY L/H ' + gi.na(CHAN, quote.day_low) + '/' + gi.na(CHAN, quote.day_high);
                str += ' | 52w L/H ' + gi.na(CHAN, quote.fifty_two_week_low) + '/' + gi.na(CHAN, quote.fifty_two_week_high);
                str += ' | P/E: ' + gi.na(CHAN, quote.pe);
                str += ' | P/S: ' + gi.na(CHAN, quote.ps);
                str += ' | P/B: ' + gi.na(CHAN, quote.pb);
                str += ' | Div/yield: ' + gi.na(CHAN, quote.div) + '/' + gi.na(CHAN, quote.yield);

                say(str, 1, {skip_verify: true});

            }, {
                return_err: true,
                headers: {
                    'Accept': 'json'
                    }
                }
            );

        }
    },
    cc: {
        action: 'get cryptocurrency info (by default in USD)',
        params: [{
            or: [{
                name: 'list',
                type: 'flag'
            },{
                and: [{
                    name: 'symbol',
                    type: 'string'
                },{
                    optional: true,
                    name: 'convert to currency',
                    key: 'convert_to',
                    type: 'string',
                    default: function(USER){ return 'USD' }
                }]
            }]
        }],
        settings: ['stock/url'],
        func: function(CHAN, USER, say, args, command_string){

            if(!info.c_list){
                var url = 'https://api.coinmarketcap.com/v1/ticker/';
                x.get_url(url, 'json', function(list){
                    if(list.err){
                        say(list);
                        b.log.error(url, list);
                        return;
                    } 

                    list.forEach(function(coin){
                        info.c_list = info.c_list || {};
                        info.c_list[coin.symbol] = coin;

                        if(coin.rank > info.c_last_rank) info.c_last_rank = coin.rank;
                    });

                    if(args.symbol){
                        get_info();
                    } else if (args.flag){
                        list_ccs();
                    }

                }, {
                    return_err: true
                });
            } else {
                if(args.symbol){
                    get_info();
                } else if (args.flag){
                    list_ccs();
                }
            }

            function list_ccs(){
                var str_list = [];

                for(var symbol in info.c_list){
                    str_list.push(CHAN.t.warn('[' + info.c_list[symbol].rank + '] ') + info.c_list[symbol].name + ' (' + symbol + ')');
                }

                say(str_list.join(', '), 1, {skip_verify: true});
            }

            function get_info(){
                args.convert_to = args.convert_to.toUpperCase();
                if(args.convert_to && info.c_convert.indexOf(args.convert_to) < 0) args.convert_to = 'USD';

                args.symbol = args.symbol.toUpperCase();
                if(!info.c_list[args.symbol]) return say({err: 'No cryptocurrency with symbol ' + args.symbol + ' found.'});

                var url2 = 'https://api.coinmarketcap.com/v1/ticker/' + info.c_list[args.symbol].id + (args.convert_to ? '/?convert=' + args.convert_to : '');
                x.get_url(url2, 'json', function(coin){
                    if(coin.err){
                        say(coin);
                        b.log.error(url2, coin);
                        return;
                    } 

                    var price = +coin[0]['price_' + args.convert_to.toLowerCase()];

                    var c = {
                        price: {value: price},
                        price_24h: {value: (coin[0].percent_change_24h * price / 100)},
                        price_24h_perc: {value: +coin[0].percent_change_24h},
                        price_7d: {value: (coin[0].percent_change_7d * price / 100)},
                        price_7d_perc: {value: +coin[0].percent_change_7d},
                    }

                    var str = CHAN.t.highlight(coin[0].name) + ' (' + CHAN.t.highlight(coin[0].symbol.toUpperCase()) + ') -> ' + gi.na(CHAN, c.price) + ' ' + args.convert_to;
                    str += ' [' + x.score(coin[0].rank, {max: info.c_last_rank, config: CHAN.config, reverse: true}) + '/' + x.score(info.c_last_rank, {max: info.c_last_rank, config: CHAN.config, reverse: true}) + ']';
                    str += ' | 24h: ' + gi.na(CHAN, c.price_24h, true) + ' ' + gi.na(CHAN, c.price_24h_perc, true, true);
                    str += ' | 7d: ' + gi.na(CHAN, c.price_7d, true) + ' ' + gi.na(CHAN, c.price_7d_perc, true, true);

                    say(str, 1, {skip_verify: true});

                }, {
                    return_err: true
                });
            }

        }
    },
    yts: {
        action: 'youtube search query',
        params: [{
            name: 'search string',
            type: 'text'
        }],
        func: function(CHAN, USER, say, args, command_string){
            var query = (args.search_string.split(/\s+/)).map(function(x){
                return encodeURIComponent(x);
            });
            say('https://www.youtube.com/results?search_query=' + query.join('+'), 1);
        }
    },
    /*g: { //figure out captcha limits
        action: 'google search query with DDG fallback',
        params: [{
            name: 'search string',
            type: 'text'
        }],
        func: function(CHAN, USER, say, args, command_string){
            gi.goog(CHAN, args.search_string, function(res, url){
                if(res.err){
                    gi.ddg(CHAN, args.search_string, function(res2, url2){
                        if(res2.err){
                            say(res2);
                        } else {
                            say(res2, 1, {skip_verify: true, url: url2})
                        }
                    });
                } else {
                    say(res, 1, {skip_verify: true, url: url});
                }

            });
        }
    },*/
    ddg: {
        action: 'DuckDuckGo search query with Google fallback',
        params: [{
            name: 'search string',
            type: 'text'
        }],
        func: function(CHAN, USER, say, args, command_string){
            gi.ddg(CHAN, args.search_string, function(res, url){
                if(res.err) return say(res);
                say(res, 1, {skip_verify: true, url: url});

                /*if(res.err){
                    gi.goog(CHAN, args.search_string, function(res2, url2){
                        if(res2.err){
                            say(res2);
                        } else {
                            say(res2, 1, {skip_verify: true, url: url2})
                        }
                    });
                } else {
                    say(res, 1, {skip_verify: true, url: url});
                }*/

            });
        }
    },
}
exports.cmds = cmds;