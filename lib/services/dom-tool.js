/* jshint esversion:6 */
define([
    'marked'
  , 'dompurify'
], function(
    marked
  , DOMPurify
){
    "use strict";
    /*global document, Event*/

    function ValueError(message) {
        this.name = 'ValueError';
        this.message = message || '(No message for ValueError)';
        this.stack = (new Error()).stack;
    }
    ValueError.prototype = Object.create(Error.prototype);
    ValueError.prototype.constructor = ValueError;


    function appendChildren(elem, contents, cloneChildNodes) {
        var _contents, i, l, child;
        if(contents === undefined || contents === null)
            _contents = [];
        else
            _contents = contents instanceof Array ? contents : [contents];
        for(i=0,l=_contents.length;i<l;i++) {
            child = _contents[i];
            if(!child || typeof child.nodeType !== 'number')
                child = createTextNode(child);
            else if(cloneChildNodes)
                child = child.cloneNode(true);//always a deep clone
            elem.appendChild(child);
        }
    }

    function createTextNode(text) {
        return document.createTextNode(text);
    }

    function createElement(tagname, attr, contents, cloneChildNodes) {
        var elem = document.createElement(tagname)
          , k
          ;

        if(attr) for(k in attr)
            elem.setAttribute(k, attr[k]);

        appendChildren(elem, contents, cloneChildNodes);
        return elem;
    }

    function createChildElement(parent, tagname, attr, contents, cloneChildNodes) {
        var elem = createElement(tagname, attr, contents, cloneChildNodes);
        parent.appendChild(elem);
        return elem;
    }

    function createElementfromHTML(tag, attr, innerHTMl, trusted=false) {
        var element = createElement(tag, attr)
          , fragment = createFragmentFromHTML(innerHTMl, trusted)
          ;
        element.appendChild(fragment);
        return element;
    }

    function createElementfromMarkdown(tag, attr, mardownText, trusted) {
        return createElementfromHTML(tag, attr, marked(mardownText, {gfm: true}), trusted);
    }

    function createFragmentFromMarkdown(mardownText, trusted=false) {
        return createFragmentFromHTML(marked(mardownText, {gfm: true}), trusted);
    }

    function appendHTML(elem, html, trusted=false) {
        var frag = createFragmentFromHTML(html, trusted);
        elem.appendChild(frag);

    }

    function appendMarkdown(elem, markdown, trusted=false) {
        appendHTML(elem, marked(markdown, {gfm: true}), trusted);
    }

    /**
     * trustedOrOptions: if it is an object, it is used as options
     * for DOMPurify.sanitize. Here's an example to additionally allow
     * html comments (<!-- comment -->) and the `contenteditable` attribute:
     *      trustedOrOptions = {
     *              ADD_TAGS: ['#comment']
     *            , ADD_ATTR: ['contenteditable']
     *      }
     * For more info see: https://github.com/cure53/DOMPurify
     */
    function createFragmentFromHTML(html, trustedOrOptions=false) {
        if(trustedOrOptions === false || typeof trustedOrOptions === 'object') {
            let purifyOptions = trustedOrOptions === false
                            ? undefined
                            : trustedOrOptions
                            ;
            html = DOMPurify.sanitize(html, purifyOptions);
        }
        return document.createRange().createContextualFragment(html);
    }

    function createFragment(contents, cloneChildNodes) {
        var frag = document.createDocumentFragment();
        appendChildren(frag, contents, cloneChildNodes);
        return frag;
    }

    function createComment(text) {
        return document.createComment(text);
    }

    function isDOMElement(node) {
        return node && node.nodeType && node.nodeType === 1;
    }

    function replaceNode(newNode, oldNode) {
        if(oldNode.parentNode) // replace has no effect if oldNode has no place
            oldNode.parentNode.replaceChild(newNode, oldNode);
    }

    function removeNode(node) {
        if(node.parentNode)
            node.parentNode.removeChild(node);
    }

    function insertBefore(newElement, referenceElement) {
        if(referenceElement.parentNode && newElement !== referenceElement)
            referenceElement.parentNode.insertBefore(newElement
                                                      , referenceElement);
    }

    function insertAfter(newElement, referenceElement) {
        // there is no element.insertAfter() in the DOM
        if(!referenceElement.nextSibling)
            referenceElement.parentNode.appendChild(newElement);
        else
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

    function getChildElementForSelector(element, selector, deep) {

        var elements = Array.prototype.slice
                            .call(element.querySelectorAll(selector));
        if(!deep)
            // I don't know an easier way to only allow
            // direct children.
            elements = elements.filter(function(elem) {
                                return elem.parentNode === element;});
        return elements[0] || null;
    }

    function* getMarkerComments(element, marker) {
        var frames = [[element && element.childNodes, 0]]
          , frame, nodelist, i, l, childNode
          , markerTestFn = typeof marker === 'string'
                        ? trimmedText => trimmedText === marker
                        // expect it to be a function
                        : marker
          ;
        main:
        while((frame = frames.pop()) !== undefined){
            nodelist = frame[0];
            for(i=frame[1],l=nodelist.length;i<l;i++) {
                childNode = nodelist[i];
                if(childNode.nodeType === 8 //Node.COMMENT_NODE == 8
                           && markerTestFn(childNode.textContent.trim())) {
                    yield childNode;
                }
                else if(childNode.nodeType === 1) { //Node.ELEMEMT_NODE == 1
                    frames.push([nodelist, i+1]);
                    frames.push([childNode.childNodes, 0]);
                    break;
                }
            }
        }
    }

    function getMarkerComment(element, marker) {
        for(let comment of getMarkerComments(element, marker))
            return comment;
        return null;
    }

    function insertAtMarkerComment(element, marker, child, fallbackPosition) {
        var found = getMarkerComment(element, marker);
        if(found)
            insert(found, 'after', child);
        else if (fallbackPosition !== false){
            // undefined defaults to append
            insert(element, fallbackPosition || 'append', child);
        }
        else
            throw new Error('Marker <!-- '+marker+' --> not found');
    }

    function clear(target, destroyEventName) {
        while(target.lastChild) {
            if(destroyEventName)
                // children can listen for the event and cleanup if needed
                // activatedElement.addEventListener('destroy', function (e) { //... }, false);
                target.lastChild.dispatchEvent(new Event(destroyEventName));
            removeNode(target.lastChild);
        }
    }

    function validateChildEvent(event, stopElement, searchAttribute) {
        var elem = event.target
          , searchAttributes = [searchAttribute]
          , i, l, results
          ;
        if(event.defaultPrevented) return;

        for(i=3,l=arguments.length;i<l;i++)
            searchAttributes.push(arguments[i]);
        while(true) {
            if(elem === stopElement.parentElement || !elem)
                return;
            if(elem.hasAttribute(searchAttribute))
                // found!
                break;
            elem = elem.parentElement;
        }
        event.preventDefault();


        if(searchAttributes.length === 1)
            return elem.getAttribute(searchAttribute);

        results = {};
        for(i=0,l=searchAttributes.length;i<l;i++)
            results[searchAttributes[i]] = elem.getAttribute(searchAttributes[i]);
        return results;
    }

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

    return {
        createElement: createElement
      , createChildElement: createChildElement
      , createElementfromHTML: createElementfromHTML
      , createElementfromMarkdown: createElementfromMarkdown
      , createTextNode: createTextNode
      , appendChildren: appendChildren
      , appendHTML: appendHTML
      , appendMarkdown: appendMarkdown
      , createFragment: createFragment
      , createComment: createComment
      , createFragmentFromHTML: createFragmentFromHTML
      , createFragmentFromMarkdown: createFragmentFromMarkdown
      , isDOMElement: isDOMElement
      , replaceNode: replaceNode
      , removeNode: removeNode
      , insert: insert
      , insertAfter: insertAfter
      , insertBefore: insertBefore
      , insertElement:insertElement
      , getChildElementForSelector: getChildElementForSelector
      , getMarkerComment: getMarkerComment
      , getMarkerComments: getMarkerComments
      , insertAtMarkerComment: insertAtMarkerComment
      , clear: clear
      , validateChildEvent: validateChildEvent
      , ValueError: ValueError
      , applyClasses: applyClasses
    };
});
