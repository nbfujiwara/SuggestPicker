/// <reference path="../../libs/jquery_1.3br.d.ts"/>

module SuggestPicker{
	export class Form{
		private _mainElement = null;
		private _inputElement = null;
		private _listElement = null;
		private _listRowElements = [];
		private _itemsElement = null;


		private _params:Params = null;
		private _device:Device = null;
		private _allList = [];
		private _prevTextValue = '';
		private _listTargetIndex = null;
		private _enterKeyPress = false;
		private _isSelectedFromList = false;

		constructor(elementId){

			this._device = new Device();

			this._mainElement = $('#' + elementId);
			this._mainElement.addClass('SuggestPickerMain');
			this._mainElement.click( (e)=>this._onClickMainHandler(e) );


			this._inputElement = $('<input type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">');
			this._inputElement.keyup( (e)=>this._onKeyUpTextHandler(e) );
			this._inputElement.keypress( (e)=>this._onKeyPressTextHandler(e) );
			this._inputElement.change( (e)=>this._onChangeTextHandler(e) );
			this._inputElement.focus( (e)=>this._onFocusInText(e) );
			this._inputElement.blur( (e)=>this._onFocusOutText(e) );

			this._itemsElement = $('<ul></ul>');

			var inputLiElm = $('<li class="sp_input"></li>');
			inputLiElm.append(this._inputElement);

			this._itemsElement.append(inputLiElm);

			this._mainElement.append(this._itemsElement);

			this._listElement = $('<ul class="SuggestPickerList"></ul>');
			$(document.body).append(this._listElement);


			this._params = new Params();


		}

		public setParams(params){
			for(var key in params){
				if(this._params.hasOwnProperty(key)){
					this._params[key] = params[key];
				}
			}
			if(this._params.single){
				this._inputElement.css('width','100%');
				this._inputElement.parent().css('display','block');
			}


		}
		public setList(list){
			this._allList = [];
			for(var i=0; i<list.length; i++){
				list[i] = this._adjustItem(list[i]);
				if(! list[i]){
					console.error('setList() failed. "value","label" is empty');
					return false;
				}
				this._allList.push({
					value:list[i].value,
					label:list[i].label,
					search:this._convertSearchString(list[i].label),
					searchKana:this._convertSearchString(list[i].kana)
				});
			}
			return true;
		}
		public setItems(list){
			for(var i=0; i<list.length; i++){
				list[i] = this._adjustItem(list[i]);
				if(! list[i]){
					console.error('setItems() failed. "value","label" is empty');
					return false;
				}
				this._appendItem(list[i].label, list[i].value);
			}
			return true;
		}
        public setItemsByValues(valueList){
            for(var i=0; i<valueList.length; i++){
                for(var k=0; k<this._allList.length; k++){
                	if(this._allList[k].value == valueList[i]){
                        this._appendItem(this._allList[k].label, this._allList[k].value);
					}
                }
            }
            return true;
        }
        public clearItems(){
            while(this._itemsElement.children('.sp_item').length > 0){
                this._itemsElement.children('.sp_item').get(0).remove();
            }
        }

		private _adjustItem(itemRow){
			if(! itemRow.hasOwnProperty('value') && ! itemRow.hasOwnProperty('label') ){
				return null;
			}
			if(! itemRow.hasOwnProperty('value') && itemRow.hasOwnProperty('label') ){
				itemRow.value = itemRow.label;
			}
			if(itemRow.hasOwnProperty('value') && ! itemRow.hasOwnProperty('label') ){
				itemRow.label = itemRow.value;
			}
			if(! itemRow.hasOwnProperty('kana')){
				itemRow.kana = "";
			}

			return itemRow;
		}


		public getItems(){
			var itemList = [];
			this._itemsElement.children('.sp_item').each(function(){

				itemList.push({
					value:$(this).attr('my_val')
					,label:$(this).find('span.sp_label').text()
				});
			});
			return itemList;

		}



		private _showList(){
			this._isSelectedFromList = false;
			this._refreshList(this._inputElement.val());
			this._listElement.css('top' ,this._inputElement.offset().top + 30);
			this._listElement.css('left' ,this._mainElement.offset().left);
			if(! this._params.hideListOnEmpty || this._inputElement.val() != ''){
				this._listElement.show();
			}
		}


		private _refreshList(str){
			if(this._params.hideListOnEmpty){
				if(this._inputElement.val() == ''){
					return;
				}else{
					this._listElement.show();
				}
			}
			var dataList = this._searchList(str);

			this._listElement.empty();
			this._listTargetIndex = null;
			this._listRowElements =[];

			for(var i=0; i<dataList.length; i++){
				var rowElm = $(document.createElement('li'));
				rowElm.text(dataList[i].label);
				//rowElm.val(dataList[i].value);
				rowElm.attr('my_val' , dataList[i].value);
				//console.log( dataList[i].value + ',' + rowElm.val() + ',' + rowElm.attr('my_val'));
				var hoverFunc = (function(_func ,arg1){
					return function(e){_func(arg1);}
				})( (_a1)=>this._mouseOverListTarget(_a1) , i);
				rowElm.hover(hoverFunc);

				var clickFunc = (function(_func ,arg1){
					return function(e){_func(arg1);}
				})( (_a1)=>this._clickListTarget(_a1) , i);
				//rowElm.click(clickFunc); //textのfocusOutでlist自体がhide()されてclickが発動しないのでmousedownにしてみる
				rowElm.mousedown(clickFunc);

				this._listElement.append(rowElm);
				this._listRowElements.push(rowElm);
			}

			if(dataList.length == 0){
				this._changeListTarget(null);
				var emptyCaption = $('<li>' + this._params.noListLabel + '</li>');
				this._listElement.append(emptyCaption);
			}else{
				//this._changeListTarget(0);
			}
			this._listElement.show();
		}

		private _isInAllList(val){
			for(var i=0; i<this._allList.length; i++){
				if(val == this._allList[i].value){
					return true;
				}
			}
			return false;

		}

		private _searchList(str){
			var nowItems = this.getItems();

			str = this._convertSearchString(str);

			//console.log('search=' + str);
			var list = [];
			for(var i=0; i<this._allList.length; i++){
				if(isExists(this._allList[i])){
					continue;
				}

				var isHit = false;
				if(str.length){
					if(this._allList[i].search.indexOf(str) != -1){
						isHit = true;
					}else if(this._allList[i].searchKana.indexOf(str) != -1){
						isHit = true;
					}
				}else{
					isHit = true;
				}
				if(isHit){
					list.push(this._allList[i]);
				}
				if(list.length >= this._params.listMax){
					break;
				}
			}
			return list;

			function isExists(row){
				for(var i=0; i<nowItems.length; i++){
					if(nowItems[i].value == row.value){
						return true;
					}
				}
				return false;
			}
		}

		private _changeListTarget(idx , adjustScroll=false){
			if(this._listTargetIndex !== null){
				this._listRowElements[ this._listTargetIndex ].removeClass('sp_target');
			}
			this._listTargetIndex = idx;
			if(idx === null){
				return;
			}

			this._listRowElements[ idx ].addClass('sp_target');

			if(adjustScroll){
				var parentElm = this._listElement;
				var targetRowElm =  this._listRowElements[ this._listTargetIndex ];
				var targetRelativePos = targetRowElm.position().top + parentElm.scrollTop();

				var minScrollVal = targetRelativePos  + targetRowElm.outerHeight() - parentElm.height();
				var maxScrollVal = targetRelativePos ;

				if(minScrollVal > parentElm.scrollTop()) {
					parentElm.scrollTop(minScrollVal);
				}else if(maxScrollVal < parentElm.scrollTop()){
					parentElm.scrollTop(maxScrollVal );
				}else{
				}
			}
		}

		private _onClickItem(e){
			var itemElm = $(e.target);
			if(! itemElm.hasClass('sp_item')){
				itemElm = itemElm.parent();
			}
			if(this._params.single){
				var itemValue = itemElm.attr('my_val');
				if(itemValue == ''){
					itemValue = itemElm.find('span.sp_label').text()
				}
				itemElm.remove();
				this._inputElement.show();
				this._prevTextValue = itemValue;
				this._inputElement.val(itemValue);
				this._refreshList(itemValue);
			}else{
				var isRemoveSelect = itemElm.hasClass('sp_selected');
				this._clearSelectedItem();
				if(! isRemoveSelect){
					itemElm.addClass('sp_selected');
				}
				return false; //clickイベントの伝播を止める
			}

		}
		private _onClickRemoveItem(e){
			//console.log('click remove item');
			var itemElm = $(e.target).parent();
			if(itemElm.hasClass('sp_selected')){
				itemElm.remove();
			}else{
				this._clearSelectedItem();
				itemElm.addClass('sp_selected');
			}
			return false; //clickイベントの伝播を止める
		}

		private _clearSelectedItem(){
			this._itemsElement.children('.sp_selected').removeClass('sp_selected');

		}


		private _mouseOverListTarget(idx){
			this._changeListTarget(idx);
		}
		private _clickListTarget(idx){
			//console.log('click list');
			this._changeListTarget(idx);
			this._decideListTarget();
			this._isSelectedFromList = true;
		}
		private _prevListTarget(){
			if(this._listTargetIndex < 1){
				return;
			}
			this._changeListTarget( this._listTargetIndex - 1 , true);
		}
		private _nextListTarget(){
			var nextIdx = null;
			if(this._listTargetIndex === null){
				nextIdx = 0;
			}else{
				nextIdx = this._listTargetIndex + 1;
			}

			if(nextIdx >= this._listRowElements.length){
				return;
			}
			this._changeListTarget( nextIdx, true);
		}
		private _decideListTarget(){
			if((this._listTargetIndex !== null) && this._listRowElements.length){
				var targetRowElm =  this._listRowElements[ this._listTargetIndex ];
				this._appendItem(targetRowElm.text() , targetRowElm.attr('my_val'));
			}else{
				if(( this._inputElement.val() != '' ) && this._params.allowNoList){
					this._appendItem(this._inputElement.val() , '');
				}
			}

			this._inputElement.val('');
			this._prevTextValue = '';
			this._listElement.hide();

			if(!this._params.single) {
				this._showList();
			}

		}

		private _removeItemByKeyEvent(){
			var selectedItemElms = this._itemsElement.children('.sp_selected');

			var targetItemElm;
			if(selectedItemElms.length){
				targetItemElm = selectedItemElms.get(0);
				targetItemElm.remove();
			}else{
				targetItemElm = this._itemsElement.children('.sp_item').last();
				targetItemElm.addClass('sp_selected');
			}

		}



		private _appendItem(label , value){

			var closeElm = this._createCloseElement();
			var itemElm = $(document.createElement('li'));

			itemElm.addClass('sp_item');
			//itemElm.val(value);


			itemElm.attr('my_val' , value); //文字列が何故かvalueにいれるとゼロになってしまったからしょうがなく
			//console.log( value + ',' + itemElm.val() + ',' + itemElm.attr('my_val'));


			if(!this._params.single) {
				itemElm.append(closeElm);
			}
			itemElm.append('<span class="sp_label">' + label + '</span>');


			closeElm.click((e)=>this._onClickRemoveItem(e));
			itemElm.click((e)=>this._onClickItem(e));
			this._inputElement.parent().before(itemElm);

			if(this._params.single){
				if(this._itemsElement.children('.sp_item').length > 0){
					this._inputElement.hide();
				}
			}
			if(this._params.allowNoList){
				if(! this._isInAllList(value)){
					itemElm.addClass('sp_noList');
				}
			}

		}

		private _onFocusInText(e){
			//console.log('focus');
			this._clearSelectedItem();
			this._showList();
		}
		private _onFocusOutText(e){
			if(! this._isSelectedFromList && this._device.isSoftwareKeyboard()){
				this._decideListTarget();
			}
			this._inputElement.val('');
			this._prevTextValue = '';
			this._listElement.hide();
		}

		private _onClickMainHandler(e){
			//console.log('taped');
			this._inputElement.focus();
		}
		private _onKeyPressTextHandler(e){
			switch (e.keyCode){
				case 13 :
					this._enterKeyPress = true;
					return;
			}
		}


		private _onChangeTextHandler(e){
			if(this._device.isSoftwareKeyboard()) {
				var nowVal = this._inputElement.val();
				this._prevTextValue = nowVal;
				this._refreshList(nowVal);
			}
		}
		private _onKeyUpTextHandler(e){
			var nowVal = this._inputElement.val();
			switch (e.keyCode){
				case 38 :
					this._prevListTarget();
					return;
				case 40 :
					this._nextListTarget();
					return;
				case 13 :
					if(this._device.isHardwareKeyboard()){
						if(this._enterKeyPress){
							this._enterKeyPress = false;
							this._decideListTarget();
							return;
						}
					}
					break;
				case 8 :
				case 48 :
					if(this._prevTextValue == ''){
						this._removeItemByKeyEvent();
						return;
					}
			}


			if(nowVal == this._prevTextValue){
				return;
			}
			this._prevTextValue = nowVal;
			//console.log('kick refresh' + nowVal);
			this._refreshList(nowVal);

		}

		private _convertSearchString(str){
			//ひらがなに
			str = str.replace(/[\u30a1-\u30f6]/g, function(s) {
				return String.fromCharCode(s.charCodeAt(0) - 0x60);
			}).replace(/・/g,'');

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
		}
		private _createCloseElement(){
			return $('<img width="12" height="12" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAaVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKCgoAAAASEhIKCgoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVhQG9AAAAInRSTlMA8/B0UUf22KV9OikhHQ4C5t2UbExAGNDLysCxnnBvZTQHXpJmjAAAAIZJREFUGNNtj1cSgzAMRIVtcAuY0NKb7n/ISDsmX3k/2l2VGdE/+r6KPKBs3h8gVnP7aP/C7LOI1jAHmYksHDMtjQpHNAQkttMSi4yWO+9YAmVi0D1p54pg+vm5QTC21VuuNA4+Qgdc0eQBv9Q52Uojs9HtWfxZn3gbs2L3xacNIqV63Un/C9flDdGyoibdAAAAAElFTkSuQmCC" alt="">');
		}


	}

	class Params{
		public allowNoList = false;
		public noListLabel = '該当なし';
		public listMax = 20;
		public single = false;
		public hideListOnEmpty = false;
	}

	class Device{
		private _ua:string = null;
		constructor(){
			this._ua =window.navigator.userAgent.toLowerCase();
		}
		public isSoftwareKeyboard(){
			var ua = this._ua;
			return (ua.indexOf("iphone") != -1
				|| ua.indexOf("ipad") != -1
				|| ua.indexOf("ipod") != -1
				|| ua.indexOf("android") != -1
				|| ua.indexOf("mobile") != -1
			);
		}
		public isHardwareKeyboard(){
			return (! this.isSoftwareKeyboard());
		}


	}

}
