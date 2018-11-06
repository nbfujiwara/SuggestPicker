/// <reference path="../../libs/jquery_1.3br.d.ts"/>
var SuggestPicker;
(function (SuggestPicker) {
    var Form = /** @class */ (function () {
        function Form(elementId) {
            var _this = this;
            this._mainElement = null;
            this._inputElement = null;
            this._listElement = null;
            this._listRowElements = [];
            this._itemsElement = null;
            this._params = null;
            this._device = null;
            this._allList = [];
            this._prevTextValue = '';
            this._listTargetIndex = null;
            this._enterKeyPress = false;
            this._isSelectedFromList = false;
            this._device = new Device();
            this._mainElement = $('#' + elementId);
            this._mainElement.addClass('SuggestPickerMain');
            this._mainElement.click(function (e) { return _this._onClickMainHandler(e); });
            this._inputElement = $('<input type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">');
            this._inputElement.keyup(function (e) { return _this._onKeyUpTextHandler(e); });
            this._inputElement.keypress(function (e) { return _this._onKeyPressTextHandler(e); });
            this._inputElement.change(function (e) { return _this._onChangeTextHandler(e); });
            this._inputElement.focus(function (e) { return _this._onFocusInText(e); });
            this._inputElement.blur(function (e) { return _this._onFocusOutText(e); });
            this._itemsElement = $('<ul></ul>');
            var inputLiElm = $('<li class="sp_input"></li>');
            inputLiElm.append(this._inputElement);
            this._itemsElement.append(inputLiElm);
            this._mainElement.append(this._itemsElement);
            this._listElement = $('<ul class="SuggestPickerList"></ul>');
            $(document.body).append(this._listElement);
            this._params = new Params();
        }
        Form.prototype.setParams = function (params) {
            for (var key in params) {
                if (this._params.hasOwnProperty(key)) {
                    this._params[key] = params[key];
                }
            }
            if (this._params.single) {
                this._inputElement.css('width', '100%');
                this._inputElement.parent().css('display', 'block');
            }
        };
        Form.prototype.setList = function (list) {
            this._allList = [];
            for (var i = 0; i < list.length; i++) {
                list[i] = this._adjustItem(list[i]);
                if (!list[i]) {
                    console.error('setList() failed. "value","label" is empty');
                    return false;
                }
                this._allList.push({
                    value: list[i].value,
                    label: list[i].label,
                    search: this._convertSearchString(list[i].label),
                    searchKana: this._convertSearchString(list[i].kana)
                });
            }
            return true;
        };
        Form.prototype.setItems = function (list) {
            for (var i = 0; i < list.length; i++) {
                list[i] = this._adjustItem(list[i]);
                if (!list[i]) {
                    console.error('setItems() failed. "value","label" is empty');
                    return false;
                }
                this._appendItem(list[i].label, list[i].value);
            }
            return true;
        };
        Form.prototype.setItemsByValues = function (valueList) {
            for (var i = 0; i < valueList.length; i++) {
                for (var k = 0; k < this._allList.length; k++) {
                    if (this._allList[k].value == valueList[i]) {
                        this._appendItem(this._allList[k].label, this._allList[k].value);
                    }
                }
            }
            return true;
        };
        Form.prototype.clearItems = function () {
            while (this._itemsElement.children('.sp_item').length > 0) {
                this._itemsElement.children('.sp_item').get(0).remove();
            }
        };
        Form.prototype._adjustItem = function (itemRow) {
            if (!itemRow.hasOwnProperty('value') && !itemRow.hasOwnProperty('label')) {
                return null;
            }
            if (!itemRow.hasOwnProperty('value') && itemRow.hasOwnProperty('label')) {
                itemRow.value = itemRow.label;
            }
            if (itemRow.hasOwnProperty('value') && !itemRow.hasOwnProperty('label')) {
                itemRow.label = itemRow.value;
            }
            if (!itemRow.hasOwnProperty('kana')) {
                itemRow.kana = "";
            }
            return itemRow;
        };
        Form.prototype.getItems = function () {
            var itemList = [];
            this._itemsElement.children('.sp_item').each(function () {
                itemList.push({
                    value: $(this).attr('my_val'),
                    label: $(this).find('span.sp_label').text()
                });
            });
            return itemList;
        };
        Form.prototype._showList = function () {
            this._isSelectedFromList = false;
            this._refreshList(this._inputElement.val());
            this._listElement.css('top', this._inputElement.offset().top + 30);
            this._listElement.css('left', this._mainElement.offset().left);
            if (!this._params.hideListOnEmpty || this._inputElement.val() != '') {
                this._listElement.show();
            }
        };
        Form.prototype._refreshList = function (str) {
            var _this = this;
            if (this._params.hideListOnEmpty) {
                if (this._inputElement.val() == '') {
                    return;
                }
                else {
                    this._listElement.show();
                }
            }
            var dataList = this._searchList(str);
            this._listElement.empty();
            this._listTargetIndex = null;
            this._listRowElements = [];
            for (var i = 0; i < dataList.length; i++) {
                var rowElm = $(document.createElement('li'));
                rowElm.text(dataList[i].label);
                //rowElm.val(dataList[i].value);
                rowElm.attr('my_val', dataList[i].value);
                //console.log( dataList[i].value + ',' + rowElm.val() + ',' + rowElm.attr('my_val'));
                var hoverFunc = (function (_func, arg1) {
                    return function (e) { _func(arg1); };
                })(function (_a1) { return _this._mouseOverListTarget(_a1); }, i);
                rowElm.hover(hoverFunc);
                var clickFunc = (function (_func, arg1) {
                    return function (e) { _func(arg1); };
                })(function (_a1) { return _this._clickListTarget(_a1); }, i);
                //rowElm.click(clickFunc); //textのfocusOutでlist自体がhide()されてclickが発動しないのでmousedownにしてみる
                rowElm.mousedown(clickFunc);
                this._listElement.append(rowElm);
                this._listRowElements.push(rowElm);
            }
            if (dataList.length == 0) {
                this._changeListTarget(null);
                var emptyCaption = $('<li>' + this._params.noListLabel + '</li>');
                this._listElement.append(emptyCaption);
            }
            else {
                //this._changeListTarget(0);
            }
            this._listElement.show();
        };
        Form.prototype._isInAllList = function (val) {
            for (var i = 0; i < this._allList.length; i++) {
                if (val == this._allList[i].value) {
                    return true;
                }
            }
            return false;
        };
        Form.prototype._searchList = function (str) {
            var nowItems = this.getItems();
            str = this._convertSearchString(str);
            //console.log('search=' + str);
            var list = [];
            for (var i = 0; i < this._allList.length; i++) {
                if (isExists(this._allList[i])) {
                    continue;
                }
                var isHit = false;
                if (str.length) {
                    if (this._allList[i].search.indexOf(str) != -1) {
                        isHit = true;
                    }
                    else if (this._allList[i].searchKana.indexOf(str) != -1) {
                        isHit = true;
                    }
                }
                else {
                    isHit = true;
                }
                if (isHit) {
                    list.push(this._allList[i]);
                }
                if (list.length >= this._params.listMax) {
                    break;
                }
            }
            return list;
            function isExists(row) {
                for (var i = 0; i < nowItems.length; i++) {
                    if (nowItems[i].value == row.value) {
                        return true;
                    }
                }
                return false;
            }
        };
        Form.prototype._changeListTarget = function (idx, adjustScroll) {
            if (adjustScroll === void 0) { adjustScroll = false; }
            if (this._listTargetIndex !== null) {
                this._listRowElements[this._listTargetIndex].removeClass('sp_target');
            }
            this._listTargetIndex = idx;
            if (idx === null) {
                return;
            }
            this._listRowElements[idx].addClass('sp_target');
            if (adjustScroll) {
                var parentElm = this._listElement;
                var targetRowElm = this._listRowElements[this._listTargetIndex];
                var targetRelativePos = targetRowElm.position().top + parentElm.scrollTop();
                var minScrollVal = targetRelativePos + targetRowElm.outerHeight() - parentElm.height();
                var maxScrollVal = targetRelativePos;
                if (minScrollVal > parentElm.scrollTop()) {
                    parentElm.scrollTop(minScrollVal);
                }
                else if (maxScrollVal < parentElm.scrollTop()) {
                    parentElm.scrollTop(maxScrollVal);
                }
                else {
                }
            }
        };
        Form.prototype._onClickItem = function (e) {
            var itemElm = $(e.target);
            if (!itemElm.hasClass('sp_item')) {
                itemElm = itemElm.parent();
            }
            if (this._params.single) {
                var itemValue = itemElm.attr('my_val');
                if (itemValue == '') {
                    itemValue = itemElm.find('span.sp_label').text();
                }
                itemElm.remove();
                this._inputElement.show();
                this._prevTextValue = itemValue;
                this._inputElement.val(itemValue);
                this._refreshList(itemValue);
            }
            else {
                var isRemoveSelect = itemElm.hasClass('sp_selected');
                this._clearSelectedItem();
                if (!isRemoveSelect) {
                    itemElm.addClass('sp_selected');
                }
                return false; //clickイベントの伝播を止める
            }
        };
        Form.prototype._onClickRemoveItem = function (e) {
            //console.log('click remove item');
            var itemElm = $(e.target).parent();
            if (itemElm.hasClass('sp_selected')) {
                itemElm.remove();
            }
            else {
                this._clearSelectedItem();
                itemElm.addClass('sp_selected');
            }
            return false; //clickイベントの伝播を止める
        };
        Form.prototype._clearSelectedItem = function () {
            this._itemsElement.children('.sp_selected').removeClass('sp_selected');
        };
        Form.prototype._mouseOverListTarget = function (idx) {
            this._changeListTarget(idx);
        };
        Form.prototype._clickListTarget = function (idx) {
            //console.log('click list');
            this._changeListTarget(idx);
            this._decideListTarget();
            this._isSelectedFromList = true;
        };
        Form.prototype._prevListTarget = function () {
            if (this._listTargetIndex < 1) {
                return;
            }
            this._changeListTarget(this._listTargetIndex - 1, true);
        };
        Form.prototype._nextListTarget = function () {
            var nextIdx = null;
            if (this._listTargetIndex === null) {
                nextIdx = 0;
            }
            else {
                nextIdx = this._listTargetIndex + 1;
            }
            if (nextIdx >= this._listRowElements.length) {
                return;
            }
            this._changeListTarget(nextIdx, true);
        };
        Form.prototype._decideListTarget = function () {
            if ((this._listTargetIndex !== null) && this._listRowElements.length) {
                var targetRowElm = this._listRowElements[this._listTargetIndex];
                this._appendItem(targetRowElm.text(), targetRowElm.attr('my_val'));
            }
            else {
                if ((this._inputElement.val() != '') && this._params.allowNoList) {
                    this._appendItem(this._inputElement.val(), '');
                }
            }
            this._inputElement.val('');
            this._prevTextValue = '';
            this._listElement.hide();
            if (!this._params.single) {
                this._showList();
            }
        };
        Form.prototype._removeItemByKeyEvent = function () {
            var selectedItemElms = this._itemsElement.children('.sp_selected');
            var targetItemElm;
            if (selectedItemElms.length) {
                targetItemElm = selectedItemElms.get(0);
                targetItemElm.remove();
            }
            else {
                targetItemElm = this._itemsElement.children('.sp_item').last();
                targetItemElm.addClass('sp_selected');
            }
        };
        Form.prototype._appendItem = function (label, value) {
            var _this = this;
            var closeElm = this._createCloseElement();
            var itemElm = $(document.createElement('li'));
            itemElm.addClass('sp_item');
            //itemElm.val(value);
            itemElm.attr('my_val', value); //文字列が何故かvalueにいれるとゼロになってしまったからしょうがなく
            //console.log( value + ',' + itemElm.val() + ',' + itemElm.attr('my_val'));
            if (!this._params.single) {
                itemElm.append(closeElm);
            }
            itemElm.append('<span class="sp_label">' + label + '</span>');
            closeElm.click(function (e) { return _this._onClickRemoveItem(e); });
            itemElm.click(function (e) { return _this._onClickItem(e); });
            this._inputElement.parent().before(itemElm);
            if (this._params.single) {
                if (this._itemsElement.children('.sp_item').length > 0) {
                    this._inputElement.hide();
                }
            }
            if (this._params.allowNoList) {
                if (!this._isInAllList(value)) {
                    itemElm.addClass('sp_noList');
                }
            }
        };
        Form.prototype._onFocusInText = function (e) {
            //console.log('focus');
            this._clearSelectedItem();
            this._showList();
        };
        Form.prototype._onFocusOutText = function (e) {
            if (!this._isSelectedFromList && this._device.isSoftwareKeyboard()) {
                this._decideListTarget();
            }
            this._inputElement.val('');
            this._prevTextValue = '';
            this._listElement.hide();
        };
        Form.prototype._onClickMainHandler = function (e) {
            //console.log('taped');
            this._inputElement.focus();
        };
        Form.prototype._onKeyPressTextHandler = function (e) {
            switch (e.keyCode) {
                case 13:
                    this._enterKeyPress = true;
                    return;
            }
        };
        Form.prototype._onChangeTextHandler = function (e) {
            if (this._device.isSoftwareKeyboard()) {
                var nowVal = this._inputElement.val();
                this._prevTextValue = nowVal;
                this._refreshList(nowVal);
            }
        };
        Form.prototype._onKeyUpTextHandler = function (e) {
            var nowVal = this._inputElement.val();
            switch (e.keyCode) {
                case 38:
                    this._prevListTarget();
                    return;
                case 40:
                    this._nextListTarget();
                    return;
                case 13:
                    if (this._device.isHardwareKeyboard()) {
                        if (this._enterKeyPress) {
                            this._enterKeyPress = false;
                            this._decideListTarget();
                            return;
                        }
                    }
                    break;
                case 8:
                case 48:
                    if (this._prevTextValue == '') {
                        this._removeItemByKeyEvent();
                        return;
                    }
            }
            if (nowVal == this._prevTextValue) {
                return;
            }
            this._prevTextValue = nowVal;
            //console.log('kick refresh' + nowVal);
            this._refreshList(nowVal);
        };
        Form.prototype._convertSearchString = function (str) {
            //ひらがなに
            str = str.replace(/[\u30a1-\u30f6]/g, function (s) {
                return String.fromCharCode(s.charCodeAt(0) - 0x60);
            }).replace(/・/g, '');
            //全角を半角に
            str = str.replace(/[Ａ-Ｚａ-ｚ]/g, function (s) {
                return String.fromCharCode(s.charCodeAt(0) - 65248);
            });
            str = str.replace(/[０-９]/g, function (s) {
                return String.fromCharCode(s.charCodeAt(0) - 65248);
            });
            //アルファベットは小文字で
            str = str.toLowerCase();
            return str;
        };
        Form.prototype._createCloseElement = function () {
            return $('<img width="12" height="12" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAaVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKCgoAAAASEhIKCgoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVhQG9AAAAInRSTlMA8/B0UUf22KV9OikhHQ4C5t2UbExAGNDLysCxnnBvZTQHXpJmjAAAAIZJREFUGNNtj1cSgzAMRIVtcAuY0NKb7n/ISDsmX3k/2l2VGdE/+r6KPKBs3h8gVnP7aP/C7LOI1jAHmYksHDMtjQpHNAQkttMSi4yWO+9YAmVi0D1p54pg+vm5QTC21VuuNA4+Qgdc0eQBv9Q52Uojs9HtWfxZn3gbs2L3xacNIqV63Un/C9flDdGyoibdAAAAAElFTkSuQmCC" alt="">');
        };
        return Form;
    }());
    SuggestPicker.Form = Form;
    var Params = /** @class */ (function () {
        function Params() {
            this.allowNoList = false;
            this.noListLabel = '該当なし';
            this.listMax = 20;
            this.single = false;
            this.hideListOnEmpty = false;
        }
        return Params;
    }());
    var Device = /** @class */ (function () {
        function Device() {
            this._ua = null;
            this._ua = window.navigator.userAgent.toLowerCase();
        }
        Device.prototype.isSoftwareKeyboard = function () {
            var ua = this._ua;
            return (ua.indexOf("iphone") != -1
                || ua.indexOf("ipad") != -1
                || ua.indexOf("ipod") != -1
                || ua.indexOf("android") != -1
                || ua.indexOf("mobile") != -1);
        };
        Device.prototype.isHardwareKeyboard = function () {
            return (!this.isSoftwareKeyboard());
        };
        return Device;
    }());
})(SuggestPicker || (SuggestPicker = {}));
//# sourceMappingURL=SuggestPicker.js.map