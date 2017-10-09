define([
], function(
) {
    "use strict";
    /*global document*/

    function applyClasses (element, classes, remove) {
        if(!classes)
            return;
        if(typeof classes === 'string')
            classes = classes.split(' ').filter(function(item){return !!item;});
        if( element.classList )
            element.classList[remove ? 'remove' : 'add'].apply(element.classList, classes);
        else {
            // IE11 and SVG elements apparently :-/
            var classesToRemove
              , seen
              , filterFunc
              ;
            if(remove) {
                classesToRemove = new Set(classes);
                filterFunc = function(item) {
                    return !classesToRemove.has(item);
                };
            }
            else {
                seen = new Set();
                element.setAttribute('class', element.getAttribute('class')
                        + (' ' + classes.join(' '))
                );

                filterFunc = function(item) {
                    if(seen.has(item))
                        return false;
                    seen.add(item);
                    return true;

                };
            }
            element.setAttribute('class', element.getAttribute('class')
                                                 .split(' ')
                                                 .filter(filterFunc)
                                                 .join(' ')
                                );

        }
    }
    function ValueError(message) {
        this.name = 'ValueError';
        this.message = message || '(No message for ValueError)';
        this.stack = (new Error()).stack;
    }
    ValueError.prototype = Object.create(Error.prototype);
    ValueError.prototype.constructor = ValueError;

    function createTextNode(text, doc) {
        return (doc || document).createTextNode(text);
    }

    function createElement(tagname, attr, contents, cloneChildNodes, doc) {
        var elem = (doc || document).createElement(tagname)
          , k
          ;

        if(attr) for(k in attr)
            elem.setAttribute(k, attr[k]);

        appendChildren(elem, contents, cloneChildNodes);
        return elem;
    }

    function appendChildren(elem, contents, cloneChildNodes) {
        var _contents, i, l, child;
        if(contents === undefined || contents === null)
            _contents = [];
        else
            _contents = contents instanceof Array ? contents : [contents];
        if(_contents) for(i=0,l=_contents.length;i<l;i++) {
            child = _contents[i];
            if(typeof child.nodeType !== 'number')
                child = createTextNode(child);
            else if(cloneChildNodes)
                child = child.cloneNode(true);//always a deep clone
            elem.appendChild(child);
        }
    }

    function insertElement(into, element, pos) {
        var children = into.children || into.childNodes
          , append = children.length
          ;
        if(pos === undefined || pos > append)
            pos = append;
        else if(pos < 0) {
            pos = children.length + pos;
            if(pos < 0)
                pos = 0;
        }
        if(pos === append)
            into.appendChild(element);
        else
            into.insertBefore(element, children[pos]);
    }

    function mapToClass(parent, class_, func, thisArg, includeParent) {
        var items = []
          , i, l
          ;
        if(includeParent && parent.classList.contains(class_))
            items.push(parent);

        Array.prototype.push.apply(items, parent.getElementsByClassName(class_));

        for(i=0,l=items.length;i<l;i++)
            func.call(thisArg || null, items[i], i);
    }

    function removeNode(node){
        node.parentNode.removeChild(node);
    }

    function insertBefore(newElement, referenceElement) {
        referenceElement.parentElement.insertBefore(newElement, referenceElement);
    }

    function insertAfter(newElement, referenceElement) {
        // there is no element.insertAfter() in the DOM
        if(!referenceElement.nextSibling)
            referenceElement.parentElement.appendChild(newElement);
        insertBefore(newElement, referenceElement.nextSibling);
    }

    function insert(element, position, child) {
        switch(position) {
            case 'append':
                element.appendChild(child);
                break;
            case 'prepend':
                if(element.firstChild)
                    insertBefore(child, element.firstChild);
                else
                    element.appendChild(child);
                break;
            case 'before':
                insertBefore(child, element);
                break;
            case 'after':
                insertAfter(child, element);
                break;
            default:
                throw new ValueError('Unknown position keyword "'+position+'".');
        }
    }

    function getMarkerComment(element, marker) {
        var frames = [[element.childNodes, 0]]
          , frame, nodelist, i, l, childNode
          ;

        main:
        while((frame = frames.pop()) !== undefined){
            nodelist = frame[0];
            for(i=frame[1],l=nodelist.length;i<l;i++) {
                childNode = nodelist[i];
                if(childNode.nodeType === 8 //Node.COMMENT_NODE == 8
                           && childNode.textContent.trim() === marker) {
                    return childNode;
                }
                if(childNode.nodeType === 1) { //Node.ELEMEMT_NODE == 1
                    frames.push([nodelist, i+1]);
                    frames.push([childNode.childNodes, 0]);
                    break;
                }
            }
        }
        return null;
    }

    function insertAtMarkerComment(element, marker, child, fallbackPosition) {
        var found = getMarkerComment(element, marker);
        if(found)
            insert(found, 'after', child);
        else if (fallbackPosition !== false)
            // undefined defaults to append
            insert(element, fallbackPosition || 'append', child);
        else
            throw new Error('Marker <!-- '+marker+' --> not found');
    }

    function validateChildEvent(event, stopElement, searchAttribute) {
        var elem = event.target;
        if(event.defaultPrevented) return;
        while(true) {
            if(elem === stopElement.parentElement || !elem)
                return;
            if(elem.hasAttribute(searchAttribute))
                // found!
                break;
            elem = elem.parentElement;
        }
        event.preventDefault();
        return elem.getAttribute(searchAttribute);
    }

    return {
        applyClasses: applyClasses
      , appendChildren: appendChildren
      , createTextNode: createTextNode
      , createElement: createElement
      , insertElement: insertElement
      , mapToClass: mapToClass
      , removeNode: removeNode
      , insertBefore: insertBefore
      , insertAfter: insertAfter
      , insert: insert
      , getMarkerComment: getMarkerComment
      , insertAtMarkerComment: insertAtMarkerComment
      , validateChildEvent: validateChildEvent
    };
});
