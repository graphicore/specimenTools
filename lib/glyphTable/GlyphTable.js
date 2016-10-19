define([
    'Atem-Pen-Case/pens/SVGPen'
], function(
    SVGPen
){
    "use strict";

    var svgns = 'http://www.w3.org/2000/svg'
      ,  defaults = {
            glyphClass: 'glyph'
        }
      ;

    function GlyphTable(doc, font, options) {
        this._element = doc.createElement('div');
        this._font = font;
        this._options = this._makeOptions(options);
    }

    var _p = GlyphTable.prototype;

    _p._makeOptions = function(options) {
            // With Object.keys we won't get keys from the prototype
            // of options but maybe we want this!?
        var keys = options ? Object.keys(options) : []
          , i, l
          , result = Object.create(defaults)
          ;
        for(i=0,l=keys.length;i<l;i++)
            result[keys[i]] = options[keys[i]];
        return result;
    };

    Object.defineProperty(_p, 'element', {
        get: function() {
            // drawing this lazily
            if(!this._element.children.length)
                this._initCells();
            return this._element;
        }
    });

    function draw(glyph, pen) {
        var i, l, cmd;
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

    _p._initCell = function(glyphName, glyphIndex) {
        var element = this._element.ownerDocument.createElement('div')
          , svg = this._element.ownerDocument.createElementNS(svgns, 'svg')
          , path = this._element.ownerDocument.createElementNS(svgns, 'path')
          , glyphSet = {}
          , pen = new SVGPen(path, glyphSet)
          , glyph = this._font.glyphs.get(glyphIndex)
            //usWinAscent and usWinDescent should be the maximum values for
            // all glyphs over the complete family.
            // So,if it ain't broken, styles of the same family should
            // all render with the same size.
          , ascent =  this._font.tables.os2.usWinAscent
          , descent = this._font.tables.os2.usWinDescent
          , yMax = this._font.tables.head.yMax
          , yMin = this._font.tables.head.yMin
          , height = ascent + descent
          , width =  yMax + (yMin > 0 ? 0 : Math.abs(yMin))
          , glyphWidth = (glyph.xMax || 0) - (glyph.xMin || 0)
            // move it `-glyph.xMin` horizontally to have it start at x=0
            // move it `width * 0.5` horizontally to have it start in the center
            // move it `-glyphWidth * 0.5` horizontally to center the glyph
          , centered = -(glyph.xMin || 0) + (width * 0.5) - (glyphWidth * 0.5)
          , transformation = [1, 0, 0, -1, centered, ascent]
          ;
        element.classList.add(this._options.glyphClass);
        svg.setAttribute('viewBox', [0, 0, width, height].join(' '));
        path.setAttribute('transform', 'matrix(' +  transformation.join(', ') + ')');

        svg.appendChild(path);
        draw(glyph, pen);
        element.appendChild(svg);
        element.setAttribute('title', glyph.name);
        this._element.appendChild(element);
    };

    _p._initCells = function() {
        var i=0
          , l= this._font.glyphNames.names.length
          ;
        for(;i<l;i++)
            this._initCell(this._font.glyphNames[i], i);
    };

    return GlyphTable;
});
