###
Syntax Diagram Creator

Copyright (c) 2011 Brian Li
Licensed under the MIT license.
###
"use strict"

## Utility functions
is_arr = (arr) -> arr instanceof Array
is_obj = (obj) -> obj? and typeof obj == "object" and not is_arr(obj)
is_str = (str) -> typeof str == "string"
count_char = (str, ch) -> str.split(ch).length - 1

merge_arr = () ->
  tmp = []
  for arr in arguments
    if is_arr(arr)
      tmp.push.apply(tmp, arr)
    else
      tmp.push(arr)
  return tmp

## 

html_enity = /\&\#(\d+);/g
remove_html_enity = if count_char(document.charset or \
                                  document.characterSet or \
                                  "", "UTF") > 0
then (str, keep_whitespace) ->
    r = str.replace(html_enity, (match, capture) ->
      c = +capture
      if not keep_whitespace
        if c == 32
          return "\u00abSP\u00bb"
        else if c == 9
          return "\u00abTAB\u00bb"
        else if c == 10
          return "\u00abNL\u00bb"
        else if c == 13
          return "\u00abCR\u00bb"
      return String.fromCharCode(c)
    )
    return if r.match(/^\s*$/) then "\u00ab\u2422\u00bb" else r

else (str, keep_whitespace) ->
    r = str.replace(html_enity, (match, capture) ->
      c = +capture
      if not keep_whitespace
        if c == 32
          return "<<SP>>"
        else if c == 9
          return "<<TAB>>"
        else if c == 10
          return "<<NL>>"
        else if c == 13
          return "<<CR>>"
      return String.fromCharCode(c)
    )
    return if r.match(/^\s*$/) then "<<WHITESPACE>>" else r

# get next word
next_word = (text, state) ->
  state or= { next: 0 }
  start = state.next
  len = text.length

  # skip space if a word starts with space
  if text.charAt(start) == " " then ++start
  if start >= len then return null

  end = start
  while end < len
    # special characters
    if text.charAt(end) in [" ", "(", ")", "*", "<", ">", "|"] then break
    ++end

  # if length of word is 1
  if start == end then ++end

  word = text.substring(start, end)
  return { next: end, word: word }

# analyse words
analyse = (words) ->
  words_len = words.length
  parse = (idx, single_token) ->
    result = []
    break_flag = !!single_token
    while idx < words_len
      c = words[idx]
      if c == "("
        # new group
        next = parse(idx + 1)
        result.push(next.result)
        idx = next.index

      else if c == "<"
        # add arguments
        if result.length > 0
          tmp = result.pop()
          if is_obj(tmp)
            next = parse(idx + 1)
            idx = next.index
            tmp.args or= []
            tmp.args.push(next.result)
            result.push(tmp)
          else
            throw "SyntaxError"
        else
          throw "SyntaxError"

      else if c == "*"
        # repeat
        tmp = result.pop()
        result.push({
          data: tmp,
          type: "repeat",
        })
        ++idx

      else if c == "|"
        # or
        tmp = if result.length > 0 then result.pop() else null
        next = parse(idx + 1, true)
        idx = next.index
        if is_obj(tmp) and tmp.type != "repeat"
          if not is_arr(tmp.data) then tmp.data = [tmp.data]
          tmp.data.push(next.result)
          result.push(tmp)
        else
          result.push({
            data: [tmp, next.result],
            type: "or",
          })

      else if c == ")"
        break_flag = true
        ++idx

      else if c == ">"
        result.reverse()
        break_flag = true
        ++idx

      else
        result.push(words[idx])
        ++idx

      if break_flag then break

    return { result: result, index: idx }

  return parse(0).result

# reduce redundant
reduce = (obj) ->
  if is_arr(obj)
    # flatten the array
    if obj.length == 0      then return null
    else if obj.length == 1 then return reduce(obj[0])
    else                         return (reduce(v) for v in obj)

  else if is_obj(obj)
    tmp = {}
    tmp[k] = reduce(v) for k, v of obj

    if tmp.type == "repeat"
      tmp.args or= [null]
      if not is_arr(tmp.args) then tmp.args = [tmp.args]
    return [null, tmp, null]

  else
    return obj

parse = (text) ->
  text = text
          # clean the text
            # remove comments as long as the # isn't after a \ 
            .replace(/(^|[^\\])#.+/g, "$1")
            # escape characters
            .replace(/\\./g, (match) ->
              c = match.charCodeAt(1)
              if c == 116 # t
                c = 9
              else if c == 110 # n
                c = 10
              else if c == 114 # r
                c = 13
              return "&#" + c + ";"
            )
            # clean whitespace
            .replace(/\s+/g, " ")

          # transform text
            # optional element [x] <=> (|x) as long as 
            # x only contains or e.g. [a|b|c]
            .replace(///
              \[
                \s*       # ignore starting and ending spaces
                (
                  [^
                    \s    # no groups
                    \(\)
                    \[\]  # no optional 
                    \*    # no repeat
                  ]*
                )
                \s*
              \]
            ///g, "(|$1)")

            # optional element [x] <=> (|(x))
            # e.g. [[a] [b]]
            .replace(/\[/g, "(|(")
            .replace(/\]/g, "))")
            
            # remove redundant *
            # e.g. a****** <=> a*
            .replace(/\*+/g, "*")
  
  # parenthese pairs
  if (count_char(text, "(") != count_char(text, ")")) or
      (count_char(text, "<") != count_char(text, ">"))
    throw "SyntaxError: unmatched parenthese"

  # retrieve all the words
  words = []
  word = null
  while word = next_word(text, word)
    words.push(word.word)

  # name of the graph
  name = null
  if words[1] == ":="
    name = words.shift()
    words.shift()

  result = analyse(words)
  result = reduce(result)
  
  # force result to be an array 
  result = if is_arr(result) then result else [result]
  # make sure that result starts and ends with null 
  result.push(null)
  result.unshift(null)
  return { name: name, syntax: result }

draw_box = (g, text, x, y, monospaced=false) ->
  t = g.text(x, y, text).attr({
    "font-family": if monospaced then "consolas,monospaced" else "helvetica,arial",
    "font-style" : if monospaced then "normal" else "italic",
    "font-size"  : 20,
    "font-weight": if monospaced then "normal" else "bold",
    "text-anchor": "start",
  })

  bbox = t.getBBox()
  r = g.rect(bbox.x - 10, bbox.y - 6, \
              bbox.width + 20, bbox.height + 12, \
              if monospaced then 10 else 0).attr({
    fill: "#EEE",
    "stroke-width": 4,
  })
  r.insertBefore(t)

  st = g.set(r, t)
  st.translate(x - st.getBBox().x, 0) # move to x
  return st

paths = []
connect = (g, p1, p2, outwards=0) ->
  start = p1.end
  end = p2.start

  # horizontal straight line
  deltaY = Math.abs(end[1] - start[1])
  if deltaY < 1e-4 then outwards = 0

  curve = (p1, p2, p3) -> [p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]].join(" ")
  if outwards == 2
    # outwards right (or)
    aux1 = [Math.max(start[0] - 20, end[0] - 20, start[0]), start[1]]
    c1   = [aux1[0] + 10, aux1[1]]
    aux2 = [Math.max(start[0] - 10, end[0] - 10, start[0]), start[1] - 10]
    aux3 = [aux2[0], end[1] + 10]
    c2   = [aux3[0], aux3[1] - 10]
    paths.push("M", start.join(" "),
                "L", aux1.join(" "),
                "C", curve(c1, aux2, aux2),
                "L", aux3.join(" "),
                "C", curve(c2, end, end)
    )
  else if outwards == -2
    # outwards left (or)
    c1   = [start[0] + 10, start[1]]
    aux1 = [Math.min(start[0] + 10, end[0] + 10, end[0]), start[1] + 10]
    aux2 = [aux1[0], Math.max(start[1], end[1] - 10)]
    c2   = [aux2[0], aux2[1] + 10]
    aux3 = [Math.min(start[0] + 20, end[0] + 20, end[0]), end[1]]
    paths.push("M", start.join(" "),
                "C", curve(c1, aux1, aux1),
                "L", aux2.join(" "),
                "C", curve(c2, aux3, aux3),
                "L", end.join(" ")
    )
  else if outwards == 1
    # outwards right (repeat)
    deltaY *= 0.5
    aux1 = [Math.max(start[0], end[0]), start[1]]
    aux2 = [aux1[0],                    end[1]]
    c1   = [aux1[0] + deltaY,           aux1[1]]
    c2   = [aux2[0] + deltaY,           aux2[1]]
    paths.push("M", start.join(" "),
                "L", aux1.join(" "),
                "C", curve(c1, c2, aux2),
                "L", end.join(" ")
    )
  else if outwards == -1
    # outwards left (repeat)
    deltaY *= 0.5
    aux1 = [Math.min(start[0], end[0]), start[1]]
    aux2 = [aux1[0],                    end[1]]
    c1   = [aux1[0] - deltaY,           aux1[1]]
    c2   = [aux2[0] - deltaY,           aux2[1]]
    paths.push("M", start.join(" "),
                "L", aux1.join(" "),
                "C", curve(c1, c2, aux2),
                "L", end.join(" "))
  else
    # straight line
    paths.push("M", start.join(" "),
                "L", end.join(" ")
    )
  return

traverse_draw = (g, obj, x, y) ->
  start_marker = g.circle(x, y, 10).attr({
    fill: "#FFF",
    stroke: "#000",
    "stroke-width": 4,
  })

  traverse = (obj, parallel) ->
    # traverse the data set and retrieve and draw all the nodes 
    if is_arr(obj)
      st = g.set()
      dy = 0
      widths = []
      if parallel then start_x = x
      for v in obj
        tmp = traverse(v)
        bbox = tmp.getBBox()
        if parallel
          # align vertial
          x = start_x
          tmp.translate(0, dy)
          widths.push(bbox.width)
          dy += bbox.height + 15
        else
          x = bbox.x + bbox.width + 20
        st.push(tmp)
      
      # align center
      if parallel
        max_width = Math.max.apply(Math, widths)
        for i in [0...st.items.length]
          st.items[i].translate(0.5 * (max_width - widths[i]), 0)
      return st

    else if is_obj(obj)
      return traverse(
                      # traverse args if present
                      (if obj.args? then [obj.data, obj.args] else obj.data),
                      true
      )

    else
      if obj?
        # draw boxes
        mono = false
        if obj.match(/^((\".*\")|(\'.*\'))$/)?
          mono = true
          obj = obj.substring(1, obj.length - 1)
        # remove whitespace if not monospaced
        return draw_box(g, remove_html_enity(obj, not mono), x, y, mono)
      else
        # null element boxes
        box = draw_box(g, "-", x, y).attr({ opacity: 0 })
        bbox = box.getBBox()
        _y = bbox.y + bbox.height * 0.5
        box.push(g.path("M" + bbox.x + " " + _y +
                        "L" + (bbox.x + bbox.width) + " " + _y).attr({
          "stroke-width": 4,
          "stroke-linecap": "round",
        }))
        return box

  traverse_connect = (obj, st, prev) ->
    if is_arr(obj)
      tmp = []
      for i in [0...obj.length]
        tmp.push(traverse_connect(obj[i], st[i], \
                                  if i > 0 then tmp[i-1] else prev))
      for i in [0...obj.length-1]
        connect(g, tmp[i], tmp[i+1]) # linearly connect elements
        # connect the "or" elements
        if tmp[i].or?
          connect(g, j, tmp[i+1], 2) for j in tmp[i].or
      return { start: tmp[0].start, end: tmp[obj.length-1].end }

    else if is_obj(obj)
      if obj.type == "or"
        tmp = []
        unconnected = [] # unconnected to the next element 
        for i in [0...obj.data.length]
          tmp.push(traverse_connect(obj.data[i], st[i], \
                                    if i > 0 then tmp[i-1] else prev))
          connect(g, prev, tmp[i], -2)
          unconnected.push(tmp[i])
        unconnected.shift() # first element is connect by the upper levels 
        tmp[0].or = unconnected
        return tmp[0]

      else if obj.type == "repeat"
        data = [obj.data, obj.args]
        tmp = []
        for i in [0...data.length]
          tmp.push(traverse_connect(data[i], st[i], prev))
          if i > 0 # args
            connect(g, {end: tmp[0].end}, {start: tmp[i].end}, 1)
            connect(g, {end: tmp[0].start}, {start: tmp[i].start}, -1)
        return tmp[0]

    else
      # return the dimensions of current box
      bbox = st.getBBox()
      _y = bbox.y + bbox.height * 0.5
      return {
        start: [bbox.x, _y],
        end: [bbox.x + bbox.width, _y],
      }

  result = traverse(obj)
  graph = traverse_connect(obj, result)

  bbox = result.getBBox()
  x = bbox.x + bbox.width
  end_marker = g.circle(x, y, 10).attr({
    fill: "#FFF",
    stroke: "#000",
    "stroke-width": 4,
  })

  # width and height of graph
  h = bbox.height + bbox.y + 5
  bbox = end_marker.getBBox()
  w = bbox.width + bbox.x + 16

  # connect start and end marker 
  connect(g, graph, {
    start: [
      bbox.x,
      bbox.y + bbox.height * 0.5
    ]
  })

  bbox = start_marker.getBBox()
  connect(g, {
    end: [
      bbox.x + bbox.width,
      bbox.y + bbox.height * 0.5
    ]
  }, graph)

  start_marker.toFront()
  p = g.path(paths.join("")).attr({
    "stroke-width": 4,
    "stroke-linecap": "butt",
  }).toBack()

  # reset paths
  paths = []

  return {
    width: w,
    height: h,
    all: g.set(result, p, start_marker, end_marker),
  }

draw = (elem, syntax)->
  elem.innerHTML = ""
  w = elem.offsetWidth
  h = elem.offsetHeight

  paper = Raphael(elem, w, h)
  height_sum = 0
  width_max = 0
  for s in syntax
    d = traverse_draw(paper, s.syntax, 30, if s.name then 55 else 30)
    d.all.translate(0, height_sum)
    if s.name
      paper.text(10, 16, remove_html_enity(s.name, true)).attr({
        "font-family": "helvetica,arial",
        "font-style" : "italic",
        "font-size"  : 24,
        "font-weight": "bold",
        "text-anchor": "start",
      }).translate(0, height_sum)
    height_sum += d.height
    width_max = Math.max(width_max, d.width)
  paper.setSize(width_max, height_sum)
  return d

window.SyntaxDiagram = (elem, code) ->
  parsed = []
  for c in code.split("====\n")
    parsed.push(parse(c))

  if is_str(elem)
    elem = document.getElementById(elem)
  return draw(elem, parsed)

