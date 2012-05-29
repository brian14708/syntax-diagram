# Syntax Diagram Creator

Create vector based syntax diagrams using RaphaëlJS.
Inspired by [http://www.json.org/](http://www.json.org/).

## Examples
    Syntax\ Title :=    # line comment 
        (group)
        this|or|that
        [optional]
        repeat*<seperator>
        \[\]\ \|        # escape special characters
        "terminal"
        non-terminal
![](https://raw.github.com/atomble/syntax-diagram/master/examples/example.png)

    Numbers := ["+"|"-"] ("0"|(1-9 0-9*)) ["." (0-9)*] [("e"|"E") ["+"|"-"] 0-9*]
![](https://raw.github.com/atomble/syntax-diagram/master/examples/numbers.png)

## Language for creating diagrams

    diagram\ syntax := (
        [char* ":="]                    # syntax title
        data*
    )*<"====" "\n">

    ====

    data := (
         (char*)                        # non-terminal 
        |(("\""|"\'") char* ("\""|"\'"))# terminal
        |(data whitespace data)         # sequential lexical elements
        |("\(" data "\)")               # group
        |("\[" data "\]")               # optional elements
        |(data "\*" ["\<" data "\>"])   # repeat and separator
        |("\#" comment "\n")            # comment
    )

    ====

    char := ( 
         "a~z"
        |"A~Z"
        |(any\ character\ except\ whitespace\ and\ \<\>\|\(\)\*\"\')
        |"0~9"
        |"\\n"                          # newline
        |"\\r"                          # carriage return
        |"\\t"                          # tab
        |("\\" any\ character\ except\ newlines)
    )

    ====

    comment := (any\ character\ except\ newlines)*

    ====

    whitespace := ("\ "|"\n"|"\r"|"\t") ()*<whitespace>
![](https://raw.github.com/atomble/syntax-diagram/master/examples/syntax.png)

## Usage
    window.SyntaxDiagram(*elem|elem-id*, *diagram-code*);

    elem: DOM element to place the diagram
    elem-id: id of element to place the diagram
    diagram-code: code for the diagram

## Licence

Released under the MIT license
