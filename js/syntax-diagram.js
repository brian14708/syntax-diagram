(function() {
  /*
  Syntax Diagram Creator
  
  Copyright (c) 2011 Brian Li
  Licensed under the MIT license.
  */
  "use strict";  var analyse, connect, count_char, draw, draw_box, html_enity, is_arr, is_obj, is_str, merge_arr, next_word, parse, paths, reduce, remove_html_enity, traverse_draw;
  is_arr = function(arr) {
    return arr instanceof Array;
  };
  is_obj = function(obj) {
    return (obj != null) && typeof obj === "object" && !is_arr(obj);
  };
  is_str = function(str) {
    return typeof str === "string";
  };
  count_char = function(str, ch) {
    return str.split(ch).length - 1;
  };
  merge_arr = function() {
    var arr, tmp, _i, _len;
    tmp = [];
    for (_i = 0, _len = arguments.length; _i < _len; _i++) {
      arr = arguments[_i];
      if (is_arr(arr)) {
        tmp.push.apply(tmp, arr);
      } else {
        tmp.push(arr);
      }
    }
    return tmp;
  };
  html_enity = /\&\#(\d+);/g;
  remove_html_enity = count_char(document.charset || document.characterSet || "", "UTF") > 0 ? function(str, keep_whitespace) {
    var r;
    r = str.replace(html_enity, function(match, capture) {
      var c;
      c = +capture;
      if (!keep_whitespace) {
        if (c === 32) {
          return "\u00abSP\u00bb";
        } else if (c === 9) {
          return "\u00abTAB\u00bb";
        } else if (c === 10) {
          return "\u00abNL\u00bb";
        } else if (c === 13) {
          return "\u00abCR\u00bb";
        }
      }
      return String.fromCharCode(c);
    });
    if (r.match(/^\s*$/)) {
      return "\u00ab\u2422\u00bb";
    } else {
      return r;
    }
  } : function(str, keep_whitespace) {
    var r;
    r = str.replace(html_enity, function(match, capture) {
      var c;
      c = +capture;
      if (!keep_whitespace) {
        if (c === 32) {
          return "<<SP>>";
        } else if (c === 9) {
          return "<<TAB>>";
        } else if (c === 10) {
          return "<<NL>>";
        } else if (c === 13) {
          return "<<CR>>";
        }
      }
      return String.fromCharCode(c);
    });
    if (r.match(/^\s*$/)) {
      return "<<WHITESPACE>>";
    } else {
      return r;
    }
  };
  next_word = function(text, state) {
    var end, len, start, word, _ref;
    state || (state = {
      next: 0
    });
    start = state.next;
    len = text.length;
    if (text.charAt(start) === " ") {
      ++start;
    }
    if (start >= len) {
      return null;
    }
    end = start;
    while (end < len) {
      if ((_ref = text.charAt(end)) === " " || _ref === "(" || _ref === ")" || _ref === "*" || _ref === "<" || _ref === ">" || _ref === "|") {
        break;
      }
      ++end;
    }
    if (start === end) {
      ++end;
    }
    word = text.substring(start, end);
    return {
      next: end,
      word: word
    };
  };
  analyse = function(words) {
    var parse, words_len;
    words_len = words.length;
    parse = function(idx, single_token) {
      var break_flag, c, next, result, tmp;
      result = [];
      break_flag = !!single_token;
      while (idx < words_len) {
        c = words[idx];
        if (c === "(") {
          next = parse(idx + 1);
          result.push(next.result);
          idx = next.index;
        } else if (c === "<") {
          if (result.length > 0) {
            tmp = result.pop();
            if (is_obj(tmp)) {
              next = parse(idx + 1);
              idx = next.index;
              tmp.args || (tmp.args = []);
              tmp.args.push(next.result);
              result.push(tmp);
            } else {
              throw "SyntaxError";
            }
          } else {
            throw "SyntaxError";
          }
        } else if (c === "*") {
          tmp = result.pop();
          result.push({
            data: tmp,
            type: "repeat"
          });
          ++idx;
        } else if (c === "|") {
          tmp = result.length > 0 ? result.pop() : null;
          next = parse(idx + 1, true);
          idx = next.index;
          if (is_obj(tmp) && tmp.type !== "repeat") {
            if (!is_arr(tmp.data)) {
              tmp.data = [tmp.data];
            }
            tmp.data.push(next.result);
            result.push(tmp);
          } else {
            result.push({
              data: [tmp, next.result],
              type: "or"
            });
          }
        } else if (c === ")") {
          break_flag = true;
          ++idx;
        } else if (c === ">") {
          result.reverse();
          break_flag = true;
          ++idx;
        } else {
          result.push(words[idx]);
          ++idx;
        }
        if (break_flag) {
          break;
        }
      }
      return {
        result: result,
        index: idx
      };
    };
    return parse(0).result;
  };
  reduce = function(obj) {
    var k, tmp, v, _i, _len, _results;
    if (is_arr(obj)) {
      if (obj.length === 0) {
        return null;
      } else if (obj.length === 1) {
        return reduce(obj[0]);
      } else {
        _results = [];
        for (_i = 0, _len = obj.length; _i < _len; _i++) {
          v = obj[_i];
          _results.push(reduce(v));
        }
        return _results;
      }
    } else if (is_obj(obj)) {
      tmp = {};
      for (k in obj) {
        v = obj[k];
        tmp[k] = reduce(v);
      }
      if (tmp.type === "repeat") {
        tmp.args || (tmp.args = [null]);
        if (!is_arr(tmp.args)) {
          tmp.args = [tmp.args];
        }
      }
      return [null, tmp, null];
    } else {
      return obj;
    }
  };
  parse = function(text) {
    var name, result, word, words;
    text = text.replace(/(^|[^\\])#.+/g, "$1").replace(/\\./g, function(match) {
      var c;
      c = match.charCodeAt(1);
      if (c === 116) {
        c = 9;
      } else if (c === 110) {
        c = 10;
      } else if (c === 114) {
        c = 13;
      }
      return "&#" + c + ";";
    }).replace(/\s+/g, " ").replace(/\[\s*([^\s\(\)\[\]\*]*)\s*\]/g, "(|$1)").replace(/\[/g, "(|(").replace(/\]/g, "))").replace(/\*+/g, "*");
    if ((count_char(text, "(") !== count_char(text, ")")) || (count_char(text, "<") !== count_char(text, ">"))) {
      throw "SyntaxError: unmatched parenthese";
    }
    words = [];
    word = null;
    while (word = next_word(text, word)) {
      words.push(word.word);
    }
    name = null;
    if (words[1] === ":=") {
      name = words.shift();
      words.shift();
    }
    result = analyse(words);
    result = reduce(result);
    result = is_arr(result) ? result : [result];
    result.push(null);
    result.unshift(null);
    return {
      name: name,
      syntax: result
    };
  };
  draw_box = function(g, text, x, y, monospaced) {
    var bbox, r, st, t;
    if (monospaced == null) {
      monospaced = false;
    }
    t = g.text(x, y, text).attr({
      "font-family": monospaced ? "consolas,monospaced" : "helvetica,arial",
      "font-style": monospaced ? "normal" : "italic",
      "font-size": 20,
      "font-weight": monospaced ? "normal" : "bold",
      "text-anchor": "start"
    });
    bbox = t.getBBox();
    r = g.rect(bbox.x - 10, bbox.y - 6, bbox.width + 20, bbox.height + 12, monospaced ? 10 : 0).attr({
      fill: "#EEE",
      "stroke-width": 4
    });
    r.insertBefore(t);
    st = g.set(r, t);
    st.translate(x - st.getBBox().x, 0);
    return st;
  };
  paths = [];
  connect = function(g, p1, p2, outwards) {
    var aux1, aux2, aux3, c1, c2, curve, deltaY, end, start;
    if (outwards == null) {
      outwards = 0;
    }
    start = p1.end;
    end = p2.start;
    deltaY = Math.abs(end[1] - start[1]);
    if (deltaY < 1e-4) {
      outwards = 0;
    }
    curve = function(p1, p2, p3) {
      return [p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]].join(" ");
    };
    if (outwards === 2) {
      aux1 = [Math.max(start[0] - 20, end[0] - 20, start[0]), start[1]];
      c1 = [aux1[0] + 10, aux1[1]];
      aux2 = [Math.max(start[0] - 10, end[0] - 10, start[0]), start[1] - 10];
      aux3 = [aux2[0], end[1] + 10];
      c2 = [aux3[0], aux3[1] - 10];
      paths.push("M", start.join(" "), "L", aux1.join(" "), "C", curve(c1, aux2, aux2), "L", aux3.join(" "), "C", curve(c2, end, end));
    } else if (outwards === -2) {
      c1 = [start[0] + 10, start[1]];
      aux1 = [Math.min(start[0] + 10, end[0] + 10, end[0]), start[1] + 10];
      aux2 = [aux1[0], Math.max(start[1], end[1] - 10)];
      c2 = [aux2[0], aux2[1] + 10];
      aux3 = [Math.min(start[0] + 20, end[0] + 20, end[0]), end[1]];
      paths.push("M", start.join(" "), "C", curve(c1, aux1, aux1), "L", aux2.join(" "), "C", curve(c2, aux3, aux3), "L", end.join(" "));
    } else if (outwards === 1) {
      deltaY *= 0.5;
      aux1 = [Math.max(start[0], end[0]), start[1]];
      aux2 = [aux1[0], end[1]];
      c1 = [aux1[0] + deltaY, aux1[1]];
      c2 = [aux2[0] + deltaY, aux2[1]];
      paths.push("M", start.join(" "), "L", aux1.join(" "), "C", curve(c1, c2, aux2), "L", end.join(" "));
    } else if (outwards === -1) {
      deltaY *= 0.5;
      aux1 = [Math.min(start[0], end[0]), start[1]];
      aux2 = [aux1[0], end[1]];
      c1 = [aux1[0] - deltaY, aux1[1]];
      c2 = [aux2[0] - deltaY, aux2[1]];
      paths.push("M", start.join(" "), "L", aux1.join(" "), "C", curve(c1, c2, aux2), "L", end.join(" "));
    } else {
      paths.push("M", start.join(" "), "L", end.join(" "));
    }
  };
  traverse_draw = function(g, obj, x, y) {
    var bbox, end_marker, graph, h, p, result, start_marker, traverse, traverse_connect, w;
    start_marker = g.circle(x, y, 10).attr({
      fill: "#FFF",
      stroke: "#000",
      "stroke-width": 4
    });
    traverse = function(obj, parallel) {
      var bbox, box, dy, i, max_width, mono, st, start_x, tmp, v, widths, _i, _len, _ref, _y;
      if (is_arr(obj)) {
        st = g.set();
        dy = 0;
        widths = [];
        if (parallel) {
          start_x = x;
        }
        for (_i = 0, _len = obj.length; _i < _len; _i++) {
          v = obj[_i];
          tmp = traverse(v);
          bbox = tmp.getBBox();
          if (parallel) {
            x = start_x;
            tmp.translate(0, dy);
            widths.push(bbox.width);
            dy += bbox.height + 15;
          } else {
            x = bbox.x + bbox.width + 20;
          }
          st.push(tmp);
        }
        if (parallel) {
          max_width = Math.max.apply(Math, widths);
          for (i = 0, _ref = st.items.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
            st.items[i].translate(0.5 * (max_width - widths[i]), 0);
          }
        }
        return st;
      } else if (is_obj(obj)) {
        return traverse((obj.args != null ? [obj.data, obj.args] : obj.data), true);
      } else {
        if (obj != null) {
          mono = false;
          if (obj.match(/^((\".*\")|(\'.*\'))$/) != null) {
            mono = true;
            obj = obj.substring(1, obj.length - 1);
          }
          return draw_box(g, remove_html_enity(obj, !mono), x, y, mono);
        } else {
          box = draw_box(g, "-", x, y).attr({
            opacity: 0
          });
          bbox = box.getBBox();
          _y = bbox.y + bbox.height * 0.5;
          box.push(g.path("M" + bbox.x + " " + _y + "L" + (bbox.x + bbox.width) + " " + _y).attr({
            "stroke-width": 4,
            "stroke-linecap": "round"
          }));
          return box;
        }
      }
    };
    traverse_connect = function(obj, st, prev) {
      var bbox, data, i, j, tmp, unconnected, _i, _len, _ref, _ref2, _ref3, _ref4, _ref5, _y;
      if (is_arr(obj)) {
        tmp = [];
        for (i = 0, _ref = obj.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
          tmp.push(traverse_connect(obj[i], st[i], i > 0 ? tmp[i - 1] : prev));
        }
        for (i = 0, _ref2 = obj.length - 1; 0 <= _ref2 ? i < _ref2 : i > _ref2; 0 <= _ref2 ? i++ : i--) {
          connect(g, tmp[i], tmp[i + 1]);
          if (tmp[i].or != null) {
            _ref3 = tmp[i].or;
            for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
              j = _ref3[_i];
              connect(g, j, tmp[i + 1], 2);
            }
          }
        }
        return {
          start: tmp[0].start,
          end: tmp[obj.length - 1].end
        };
      } else if (is_obj(obj)) {
        if (obj.type === "or") {
          tmp = [];
          unconnected = [];
          for (i = 0, _ref4 = obj.data.length; 0 <= _ref4 ? i < _ref4 : i > _ref4; 0 <= _ref4 ? i++ : i--) {
            tmp.push(traverse_connect(obj.data[i], st[i], i > 0 ? tmp[i - 1] : prev));
            connect(g, prev, tmp[i], -2);
            unconnected.push(tmp[i]);
          }
          unconnected.shift();
          tmp[0].or = unconnected;
          return tmp[0];
        } else if (obj.type === "repeat") {
          data = [obj.data, obj.args];
          tmp = [];
          for (i = 0, _ref5 = data.length; 0 <= _ref5 ? i < _ref5 : i > _ref5; 0 <= _ref5 ? i++ : i--) {
            tmp.push(traverse_connect(data[i], st[i], prev));
            if (i > 0) {
              connect(g, {
                end: tmp[0].end
              }, {
                start: tmp[i].end
              }, 1);
              connect(g, {
                end: tmp[0].start
              }, {
                start: tmp[i].start
              }, -1);
            }
          }
          return tmp[0];
        }
      } else {
        bbox = st.getBBox();
        _y = bbox.y + bbox.height * 0.5;
        return {
          start: [bbox.x, _y],
          end: [bbox.x + bbox.width, _y]
        };
      }
    };
    result = traverse(obj);
    graph = traverse_connect(obj, result);
    bbox = result.getBBox();
    x = bbox.x + bbox.width;
    end_marker = g.circle(x, y, 10).attr({
      fill: "#FFF",
      stroke: "#000",
      "stroke-width": 4
    });
    h = bbox.height + bbox.y + 5;
    bbox = end_marker.getBBox();
    w = bbox.width + bbox.x + 16;
    connect(g, graph, {
      start: [bbox.x, bbox.y + bbox.height * 0.5]
    });
    bbox = start_marker.getBBox();
    connect(g, {
      end: [bbox.x + bbox.width, bbox.y + bbox.height * 0.5]
    }, graph);
    start_marker.toFront();
    p = g.path(paths.join("")).attr({
      "stroke-width": 4,
      "stroke-linecap": "butt"
    }).toBack();
    paths = [];
    return {
      width: w,
      height: h,
      all: g.set(result, p, start_marker, end_marker)
    };
  };
  draw = function(elem, syntax) {
    var d, h, height_sum, paper, s, w, width_max, _i, _len;
    elem.innerHTML = "";
    w = elem.offsetWidth;
    h = elem.offsetHeight;
    paper = Raphael(elem, w, h);
    height_sum = 0;
    width_max = 0;
    for (_i = 0, _len = syntax.length; _i < _len; _i++) {
      s = syntax[_i];
      d = traverse_draw(paper, s.syntax, 30, s.name ? 55 : 30);
      d.all.translate(0, height_sum);
      if (s.name) {
        paper.text(10, 16, remove_html_enity(s.name, true)).attr({
          "font-family": "helvetica,arial",
          "font-style": "italic",
          "font-size": 24,
          "font-weight": "bold",
          "text-anchor": "start"
        }).translate(0, height_sum);
      }
      height_sum += d.height;
      width_max = Math.max(width_max, d.width);
    }
    paper.setSize(width_max, height_sum);
    return d;
  };
  window.SyntaxDiagram = function(elem, code) {
    var c, parsed, _i, _len, _ref;
    parsed = [];
    _ref = code.split("====\n");
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      c = _ref[_i];
      parsed.push(parse(c));
    }
    if (is_str(elem)) {
      elem = document.getElementById(elem);
    }
    return draw(elem, parsed);
  };
}).call(this);
