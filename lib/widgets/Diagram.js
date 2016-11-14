define([
    'specimenTools/_BaseWidget'
  , 'Atem-Pen-Case/pens/SVGPen'
  , 'Atem-Pen-Case/pens/BoundsPen'
  , 'Atem-Pen-Case/pens/TransformPen'
], function(
    Parent
  , SVGPen
  , BoundsPen
  , TransformPen
) {
    "use strict";

    /**
     * This is a stub!
     *
     * The aim of the Diagram widget is to enable the rendering of SVG
     * based diagrams to illustrate certain aspects of the font.
     * Examples are right now a rather generic x-height diagram and a
     * rather specific `stylisticSets` diagram, that renders two glyph
     * alternates on top of each other.
     * Eventually, a small domain specific language or something similar
     * should be available to describe such diagrams, so that it is easy
     * for a designer or a specialized tool, to create these diagrams
     * for specific fonts.
     */


    var svgns = 'http://www.w3.org/2000/svg';

    /**
     * options:
     *   minLeftSideBearing
     *   minRightSideBearing
     *   align left|centert|right
     */
    function Box(doc, children, options) {
        this.options = options;
        this.leftSideBearing = null;
        this.rightSideBearing = null;
        this.rawWidth = 0;
        this._children = children;
        this.element = doc.createElementNS(svgns, 'g');
        this._addChildren(children);
        this._allignChildren(this.options.align);
    }
    Box.prototype._addChildren = function(children) {
        var i, l, child, lsb = [], rsb = [];
        if(this.options.minLeftSideBearing)
            lsb.push(this.options.minLeftSideBearing);
        if(this.options.minRightSideBearing)
             rsb.push(this.options.minRightSideBearing);
        for(i=0,l=children.length;i<l;i++) {
            child = children[i];
            insertElement(this.element, child.element, child.options.insert);
            if(child.noDimensions)
                // don't consider these
                continue;
            lsb.push(child.leftSideBearing);
            rsb.push(child.rightSideBearing);
            this.rawWidth = i === 0
                        ? child.rawWidth
                        : Math.max(this.rawWidth, child.rawWidth);


        }
        this.leftSideBearing = lsb.length
                    ? Math.max.apply(null, lsb)
                    : 0
                    ;
        this.rightSideBearing = rsb.length
                    ? Math.max.apply(null, rsb)
                    : 0
                    ;
    };
    Object.defineProperty(Box.prototype, 'width', {
        get: function() {
            return this.leftSideBearing + this.rawWidth + this.rightSideBearing;
        }
      , enumerable: true
    });
    Box.prototype._allignChildren = function(xpos) {
        var sorted = this._children
                            .filter(function(child){ return !child.noDimensions;})
                            .sort(function(childA, childB) {
                // narrowest item first
                return childA.rawWidth - childB.rawWidth;
            })
          , widest = sorted.pop()
          , i, l, x
          ;
        for(i=0,l=sorted.length;i<l;i++) {
            switch(xpos) {
                case('right'):
                    x = widest.rawWidth - sorted[i].rawWidth;
                    break;
                case('center'):
                    x = (widest.rawWidth - sorted[i].rawWidth) * 0.5;
                    break;
                case('left'):
                    /* falls through */
                default:
                    x=0;
                    break;
            }
            setTransform(sorted[i]. element, [1, 0, 0, 1, x, 0]);
        }
    };

    function setTransform(element, transformation) {
        element.setAttribute('transform', 'matrix('
                                    +  transformation.join(', ') + ')');
    }

    function insertElement(into, element, pos) {
        var append = into.children.length;
        if(pos === undefined || pos > append)
            pos = append;
        else if(pos < 0) {
            pos = into.children.length + pos;
            if(pos < 0)
                pos = 0;
        }
        if(pos === append)
            into.appendChild(element);
        else
            into.insertBefore(element, into.children[pos]);
    }

    function Layout(doc, children, options) {
        this.options = options;
        this.leftSideBearing = 0;
        this.rightSideBearing = 0;
        this._children = children;
        this.element = doc.createElementNS(svgns, 'g');
        this._addChildren(children);
    }

    Object.defineProperty(Layout.prototype, 'width', {
        get: function() {
            var i, l, width=0;
            for(i=0,l=this._children.length;i<l;i++) {
                if(this._children[i].noDimensions)
                    // don't consider these
                    continue;
                if(i > 0 && this.options.spacing)
                    width += this.options.spacing;
                width += this._children[i].width;
            }
            return width;
        }
      , enumerable: true
    });
    Object.defineProperty(Layout.prototype, 'rawWidth', {
        get: function() {
            return this.width - this.leftSideBearing - this.rightSideBearing;
        }
    });
    Layout.prototype._addChildren = function(children) {
        var i, l, child, xadvance = 0;
        if(!children.length) return;
        this.leftSideBearing = children[0].leftSideBearing;
        this.rightSideBearing = children[children.length-1].rightSideBearing;
        for(i=0,l=children.length;i<l;i++) {
            child = children[i];
            insertElement(this.element, child.element, child.options.insert);
            if(child.noDimensions)
                // don't consider these
                continue;
            setTransform(child.element, [1, 0, 0, 1, xadvance, 0]);
            if(this.options.spacing)
                xadvance += this.options.spacing;
            xadvance += child.width;
        }
    };

    function Glyph(doc, glyph, options) {
        var boundsPen, bounds, svgPen, pen;
        this.options = options;
        boundsPen = new BoundsPen({});
        draw(glyph, boundsPen);
        // [xMin, yMin, xMax, yMax]
        bounds = boundsPen.getBounds();
        this.leftSideBearing = bounds[0];
        this.rightSideBearing = glyph.advanceWidth - bounds[2];
        this.rawWidth = bounds[2] - bounds[0];
        this.width = glyph.advanceWidth;

        this.element = doc.createElementNS(svgns, 'path');
        svgPen = new SVGPen(this.element, {});
        // so, in path is now the glyph without it's left side bearing!
        pen = new TransformPen(svgPen, [1, 0, 0, 1, -this.leftSideBearing, 0]);
        draw(glyph, pen);
    }

    function YLine(doc, val, options) {
        this.options = options;
        this.element = doc.createElementNS(svgns, 'line');
        this.element.setAttribute('x1', 0);
        this.element.setAttribute('y1', val);
        this.element.setAttribute('y2', val);
    }
    YLine.prototype.noDimensions = true;
    YLine.prototype.setExtend = function(val) {
        this.element.setAttribute('x2', val);
    };

    function Diagram(container, pubSub, fontsData, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;
        this._svg = null;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
    }

    var _p = Diagram.prototype = Object.create(Parent.prototype);
    _p.constructor = Diagram;

    Diagram.defaultOptions = {
        glyphClass: 'diagram__glyph'
      , ylineClass: 'diagram__yline'
      , boxClass: 'diagram__box'
      , layoutClass: 'diagram__layout'
    };

    function draw(glyph, pen) {
        var i, l, cmd;
        glyph.getPath();
        for(i=0,l=glyph.path.commands.length;i<l;i++){
            cmd = glyph.path.commands[i];
            switch (cmd.type) {
                case 'M':
                    pen.moveTo([cmd.x, cmd.y]);
                    break;
                case 'Z':
                    pen.closePath();
                    break;
                case 'Q':
                    pen.qCurveTo([cmd.x1, cmd.y1], [cmd.x, cmd.y]);
                    break;
                case 'C':
                    pen.curveTo([cmd.x1, cmd.y1], [cmd.x2, cmd.y2],[cmd.x, cmd.y]);
                    break;
                case 'L':
                    pen.lineTo([cmd.x, cmd.y]);
                    break;
                default:
                    console.warn('Unknown path command:', cmd.type);
            }
        }
    }

    var instructions = {
        xHeight: ['box',
            [
                ['layout', [
                        ['glyph', 'x', {style: 'highlighted'}]
                      , ['glyph', 'X', {style: 'normal'}]
                    ]
                  , {spacing: 40}
                ]
              , ['yline', 'baseLine', {style: 'normal', insert: 0}]// 0 = insert as first element, -1 = insert as last element
              , ['yline', 'xHeight', {style: 'highlighted', insert: 0}]
            ]
          , {
                minLeftSideBearing: 50
              , minRightSideBearing: 50
            }
        ]
      , stylisticSets: ['layout',
            [
                ['box', [
                        ['glyph', 'G.ss04', {style: 'highlighted'}]
                      , ['glyph',  'G', {style: 'muted'}]
                    ]
                  , {align: 'center'}
                ]
              , ['box', [
                        ['glyph', 'g.ss01', {style: 'highlighted'}]
                      , ['glyph',  'g', {style: 'muted'}]
                    ]
                  , {align: 'left'}
                ]
              , ['box', [
                        ['glyph', 'R.ss03', {style: 'highlighted'}]
                      , ['glyph',  'R', {style: 'muted'}]
                    ]
                  , {align: 'left'}
                ]
              , ['box', [
                        ['glyph', 'l.ss02', {style: 'highlighted'}]
                      , ['glyph',  'l', {style: 'muted'}]
                    ]
                  , {align: 'left'}
                ]
            ]
        ]
    };

    _p._constructors = {
        glyph: Glyph
      , layout: Layout
      , box: Box
      , yline: YLine
    };

    _p._applyStyles = function(type, item) {
        var cssClass = this._options[type + 'Class']
          , cssBehaviorClass
          ;
        this._applyClasses(item.element, cssClass);
        if(item.options.style) {
            cssBehaviorClass = cssClass + '_' + item.options.style;
            this._applyClasses(item.element, cssBehaviorClass);
        }
    };

    _p._renderElement = function(instructions, fontIndex) {
        var type = instructions[0]
          , options = instructions[2] || {}
          , i, l
          , Type = this._constructors[type]
          , content, item, child, yLines = []
          ;
        switch(type) {
            case('glyph'):
                content = this._fontsData.getGlyphByName(fontIndex, instructions[1]);
                break;
            case('yline'):
                content = instructions[1] !== 'baseLine'
                        ? this._fontsData.getFontValue(fontIndex, instructions[1])
                        : 0
                        ;
                break;
            default:
                content = [];
                for(i=0,l=instructions[1].length;i<l;i++) {
                    // recursion
                    child = this._renderElement(instructions[1][i], fontIndex);
                    content.push(child);
                    if(child instanceof YLine)
                        yLines.push(child);
                }
        }
        item = new Type(this._container.ownerDocument, content, options);
        this._applyStyles(type, item);
        for(i=0,l=yLines.length;i<l;i++)
            yLines[i].setExtend(item.width);
        return item;
    };

    _p._getFontDimensions = function(font) {
        var ascent, descent, width, yMax, yMin, height;
        yMax = font.tables.head.yMax;
        yMin = font.tables.head.yMin;
        width =  yMax + (yMin > 0 ? 0 : Math.abs(yMin));
        //usWinAscent and usWinDescent should be the maximum values for
        // all glyphs over the complete family.
        // So,if it ain't broken, styles of the same family should
        // all render with the same size.
        ascent = 'diagramAscent' in this._container.dataset
                ? parseFloat(this._container.dataset.diagramAscent)
                : font.tables.os2.usWinAscent
                ;
        descent = 'diagramDescent' in this._container.dataset
                ? parseFloat(this._container.dataset.diagramDescent)
                : font.tables.os2.usWinDescent
                ;
        height = 'diagramHeight' in this._container.dataset
                ? parseFloat(this._container.dataset.diagramHeight)
                : ascent + descent
                ;

        return {
              width: width
            , height: height
            , ascent: ascent
            , descent: descent
        };
    };

    _p._render = function(instructions, fontIndex) {
        var svg = this._container.ownerDocument.createElementNS(svgns, 'svg')
          , child = this._renderElement(instructions, fontIndex)
          , width = child.width
          , dimensions = this._getFontDimensions(this._fontsData.getFont(fontIndex))
          , height = dimensions.height
          , ascent = dimensions.ascent
          ;
        svg.setAttribute('viewBox', [0, 0, width, height].join(' '));
        setTransform(child.element, [1, 0, 0, -1, child.leftSideBearing, ascent]);
        svg.appendChild(child.element);
        return svg;
    };

    _p._onActivateFont = function(fontIndex) {
        var instructionsKey = this._container.dataset.diagramName
          , instructionSet = instructions[instructionsKey]
          ;
        if(this._svg)
            this._container.removeChild(this._svg);
        if(!instructionSet || !instructionSet)
            return;
        this._svg = this._render(instructionSet, fontIndex);
        this._container.appendChild(this._svg);
    };

    return Diagram;
});
