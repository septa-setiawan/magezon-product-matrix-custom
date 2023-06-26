
define([
    'jquery',
    'underscore',
    'Magento_Catalog/js/price-utils',
    'mage/template',
    'mage/translate'
], function ($, _, utils, mageTemplate, $t) {
    'use strict';

    return function (widget) {

        $.widget('mage.SwatchRenderer', widget, {
            options: {
                displayOldPrice: window.productmatrix.displayOldPrice,
                displayAvailableQty: window.productmatrix.displayAvailableQty,
                displayResetBtn: window.productmatrix.displayResetBtn,
                displayViewmoreBtn: window.productmatrix.displayViewmoreBtn,
                priceTemplate: '<span class="price"><%- data.formatted %></span>',
                matrixType: 'type1',
                fakeHeadingLabel: 'Fake1',
                fakeAttributeLabel: 'Fake2'
            },

            lastId: '',

            enabled: window.productmatrix.enabled,

            matrixType: 'type1',

            _init: function () {
                this.enabled = !!window.productmatrix.enabled && !!this.options.jsonConfig.enableProductMattrix;

                var total = Object.keys(this.options.jsonConfig.attributes).length;
                if (total>=2) {
                    if (total > 2) {
                        this.matrixType = 'type2';
                    }
                } else {
                    this.enabled = false;
                }

                if (this.isFakeMode()) {
                    this.enabled = true;
                    const firstOption = _.head(_.values(this.options.jsonConfig.attributes));
                    this.options.jsonConfig.attributes['fake'] = {
                        code: "fake",
                        id: "fake",
                        label: this.options.jsonConfig.fakeHeadingLabel,
                        options: firstOption.options,
                        position: "1"
                    }
                }

                this._super();
            },

            _RenderControls: function () {
                if (this.inProductList || !this.enabled) {
                    this._super();
                } else {
                    if (this.matrixType == 'type1') {
                        this._renderMatrixTable();
                    }

                    if (this.matrixType == 'type2') {
                        this._super();
                        
                        var $widget = this;
                        var total   = Object.keys(this.options.jsonConfig.attributes).length;
                        $.each($widget.options.jsonConfig.attributes, function (index, item) {
                            if (index == total-1) {
                                $widget.lastId = item.id;
                            }
                        });

                        var productOptions = {};
                        for (var k in $widget.options.jsonConfig.index) {
                            if (!productOptions.length) {
                                productOptions = $widget.options.jsonConfig.index[k];
                                break;
                            }
                        }

                        this._renderLastControl(productOptions, true);

                        this._PmtEventListener();
                    }
                }
            },

            _renderLastControl: function(productOptions, initial) {

                var options   = _.clone(productOptions);
                var lastValue = options[this.lastId];

                delete options[this.lastId];

                var totalAtributes = Object.keys(this.options.jsonConfig.attributes).length;

                if (Object.keys(options).length != totalAtributes-1) return;

                var $widget        = this;
                var classes        = this.options.classes;
                var lastOption     = this.options.jsonConfig.attributes[totalAtributes-1];
                var controlLabelId = 'option-label-' + lastOption.code + '-' + lastOption.id;

                $('.mgz-pmt').remove();
                $('.' + classes.attributeClass + '.' + lastOption.code).remove();

                var html = '<div class="mgz-pmt pmt-type2">';
                    html += '<table class="' + classes.attributeClass + ' ' + lastOption.code + '" ' +
                 'data-attribute-code="' + lastOption.code + '" ' +
                 'data-attribute-id="' + lastOption.id + '">';

                    html += '<thead>';
                    html += '<tr>';

                        html += '<th>' + lastOption.label + '</th>';

                        if ($widget.options.displayOldPrice) {
                            html += '<th>' + $t('Old Price') + '</th>';
                        }

                        html += '<th>' + $t('Price') + '</th>';
                        html += '<th>' + $t('Qty') + '</th>';

                        if ($widget.options.displayAvailableQty) {
                            html += '<th>' + $t('Available Qty') + '</th>';
                        }

                    html += '</tr>';
                    html += '</thead>';

                    html += '<tbody class="' + classes.attributeClass + ' ' + lastOption.code + '" ' +
                 'data-attribute-code="' + lastOption.code + '" ' +
                 'data-attribute-id="' + lastOption.id + '">';

                    var optionConfig = $widget.options.jsonSwatchConfig[lastOption.id];

                    $.each(lastOption['options'], function (index, option) {

                        if (!lastValue) {
                            lastValue = option.id;
                        }

                        var inputName = 'pmt_options[' + lastOption.id + '][' + option.id + ']';

                        var productOptions = _.clone(options);
                        productOptions[lastOption.id] = option.id;

                        var product = $widget.options.jsonConfig.optionPrices[_.findKey($widget.options.jsonConfig.index, productOptions)];

                        if (product) {

                            html += '<tr>';
                                html += '<td>' + $widget._renderLabel(option, controlLabelId, optionConfig) + '</td>';

                                if ($widget.options.displayOldPrice) {
                                    html += '<td>' + $widget._renderOldPriceHtml(product.oldPrice.amount) + '</td>';
                                }

                                html += '<td>' + $widget._renderPriceHtml(product.finalPrice.amount) + '</td>';
                                html += $widget._PmtRenderInput(product, productOptions, inputName);

                                if ($widget.options.displayAvailableQty) {
                                    html += '<td>' + (product.isSalable ? product['qty'] : '-') + '</td>';
                                }

                            html += '</tr>';
                        }
                    });

                    html += '</tbody>';


                html += '</table>';
                html += '</div>';
                this.element.append(html);

                this._PmtBtnHtml($('.mgz-pmt'));

                if (!initial) {
                    $('.swatch-option[data-option-id="' + lastValue + '"]').trigger('click');
                }
            },

            _renderMatrixTable: function() {

                var $widget = this,
                container   = this.element,
                classes     = this.options.classes,
                chooseText  = this.options.jsonConfig.chooseText;

                $widget.optionsMap = {};

                var html = '<div class="mgz-pmt pmt-type1">';
                html += '<table>';

                // Render Table Head
                var firstOption    = this.options.jsonConfig.attributes[0];
                var secondOption   = this.options.jsonConfig.attributes[1];
                var controlLabelId = 'option-label-' + firstOption.code + '-' + firstOption.id;
                var listLabel      = 'aria-labelledby="' + controlLabelId + '"';

                html += '<thead class="' + classes.attributeClass + ' ' + firstOption.code + '" ' +
                 'data-attribute-code="' + firstOption.code + '" ' +
                 'data-attribute-id="' + firstOption.id + '">';
                html += '<tr aria-activedescendant="" ' +
                     'tabindex="0" ' +
                     'aria-invalid="false" ' +
                     'aria-required="true" ' +
                     'role="listbox" ' + listLabel +
                     'class="' + classes.attributeOptionsWrapper + ' clearfix">';
                html += '<th class="pmt-line-wrapper"><div class="pmt-line"></div>';
                html += '<span class="pmt-attribute1">' + firstOption.label + '</span>';
                html += '<span class="pmt-attribute2">' + secondOption.label + '</span>';
                html += '</th>';
                $.each(firstOption['options'], function (index, item) {
                    var item = this;
                    var optionConfig = $widget.options.jsonSwatchConfig[firstOption.id];
                    html += '<th>';
                        html += $widget._renderLabel(item, controlLabelId, optionConfig);
                    html += '</th>';
                });
                html += '</tr>';
                html += '</thead>';

                // Render Table Body
                var controlLabelId = 'option-label-' + secondOption.code + '-' + secondOption.id;
                html += '<tbody class="' + classes.attributeClass + ' ' + secondOption.code + '" ' +
                 'data-attribute-code="' + secondOption.code + '" ' +
                 'data-attribute-id="' + secondOption.id + '">';

                    $.each(secondOption['options'], function (index, item) {
                        var optionConfig = $widget.options.jsonSwatchConfig[secondOption.id];

                        html += '<tr aria-activedescendant="" ' +
                     'tabindex="0" ' +
                     'aria-invalid="false" ' +
                     'aria-required="true" ' +
                     'role="listbox" ' + listLabel +
                     'class="' + classes.attributeOptionsWrapper + ' clearfix">';

                            html += '<td>';
                            
                            if ($widget.isFakeMode()) {
                                html += $widget.options.jsonConfig.fakeAttributeLabel;
                            } else {
                                html += $widget._renderLabel(item, controlLabelId, optionConfig);
                            }
                            html += '</td>';

                            $.each(firstOption['options'], function (index1, item1) {
                                var productOptions = {};
                                productOptions[firstOption.id]  = item1.id;
                                if (!$widget.isFakeMode()) {
                                    productOptions[secondOption.id] = item.id;
                                }
                                var product   = $widget.options.jsonConfig.optionPrices[_.findKey($widget.options.jsonConfig.index, productOptions)];
                                let inputName = '';
                                if ($widget.isFakeMode()) {
                                    inputName = 'pmt_options[' + firstOption.id + '][' + item1.id + ']';
                                } else {
                                    inputName = 'pmt_options[' + firstOption.id + '_' + secondOption.id + '][' + item1.id + '_' + item.id + ']';
                                }
                                html += $widget._PmtRenderInput(product, productOptions, inputName);
                            });

                        html += '</tr>';

                        if ($widget.isFakeMode()) {
                            return false;
                        }
                    });
                html += '</tbody>';

                $widget._PmtEventListener();

                $.each(this.options.jsonConfig.attributes, function () {
                    var item = this,
                        controlLabelId = 'option-label-' + item.code + '-' + item.id,
                        options = $widget._RenderSwatchOptions(item, controlLabelId),
                        select = $widget._RenderSwatchSelect(item, chooseText),
                        input = $widget._RenderFormInput(item),
                        listLabel = '',
                        label = '';

                    // Show only swatch controls
                    if ($widget.options.onlySwatches && !$widget.options.jsonSwatchConfig.hasOwnProperty(item.id)) {
                        return;
                    }

                    $widget.optionsMap[item.id] = {};

                    // Aggregate options array to hash (key => value)
                    $.each(item.options, function () {
                        if (this.products.length > 0) {
                            $widget.optionsMap[item.id][this.id] = {
                                price: parseInt(
                                    $widget.options.jsonConfig.optionPrices[this.products[0]].finalPrice.amount,
                                    10
                                ),
                                products: this.products
                            };
                        }
                    });
                });

                html += '</table>';
                html += '</div>';

                container.append(html);

                this._PmtBtnHtml($('.mgz-pmt'));

                // Connect Tooltip
                container
                    .find('[data-option-type="1"], [data-option-type="2"], [data-option-type="0"], [data-option-type="3"]')
                    .SwatchRendererTooltip();

                // Hide all elements below more button
                $('.' + classes.moreButton).nextAll().hide();

                // Handle events like click or change
                $widget._EventListener();

                // Rewind options
                $widget._Rewind(container);

                //Emulate click on all swatches from Request
                $widget._EmulateSelected($.parseQuery());
                $widget._EmulateSelected($widget._getSelectedAttributes());
            },

            _renderLabel: function(item, controlId, optionConfig) {

                var optionClass = this.options.classes.optionClass,
                html = '';

                var id,
                    type,
                    value,
                    thumb,
                    label,
                    attr;


                if (optionConfig && !optionConfig.hasOwnProperty(item.id)) {
                    return '';
                }
                    
                label = item.label ? item.label : '';

                if (optionConfig) {
                    id = item.id;
                    type = parseInt(optionConfig[id].type, 10);
                    value = optionConfig[id].hasOwnProperty('value') ? optionConfig[id].value : '';
                    thumb = optionConfig[id].hasOwnProperty('thumb') ? optionConfig[id].thumb : '';
                    attr =
                        ' id="' + controlId + '-item-' + id + '"' +
                        ' aria-checked="false"' +
                        ' aria-describedby="' + controlId + '"' +
                        ' tabindex="0"' +
                        ' data-option-type="' + type + '"' +
                        ' data-option-id="' + id + '"' +
                        ' data-option-label="' + label + '"' +
                        ' aria-label="' + label + '"' +
                        ' option-tooltip-thumb="' + thumb + '"' +
                        ' option-tooltip-value="' + value + '"' +
                        ' role="option"';

                    attr += thumb !== '' ? ' data-option-tooltip-thumb="' + thumb + '"' : '';
                    attr += value !== '' ? ' data-option-tooltip-value="' + value + '"' : '';

                    if (!item.hasOwnProperty('products') || item.products.length <= 0) {
                        attr += ' option-empty="true"';
                    }

                    if (type === 0) {
                        // Text
                        html += '<div class="' + optionClass + ' text" ' + attr + '>' + (value ? value : label) +
                            '</div>';
                    } else if (type === 1) {
                        // Color
                        html += '<div class="' + optionClass + ' color" ' + attr +
                            ' style="background: ' + value +
                            ' no-repeat center; background-size: initial;">' + '' +
                            '</div>';
                    } else if (type === 2) {
                        // Image
                        html += '<div class="' + optionClass + ' image" ' + attr +
                            ' style="background: url(' + value + ') no-repeat center; background-size: initial;">' + '' +
                            '</div>';
                    } else if (type === 3) {
                        // Clear
                        html += '<div class="' + optionClass + '" ' + attr + '></div>';
                    } else {
                        // Default
                        html += '<div class="' + optionClass + '" ' + attr + '>' + label + '</div>';
                    }
                } else {
                    html += label;
                }

                return html;
            },

            _OnClick: function($this, $widget, eventName) {
                this._super($this, $widget, eventName);

                if (this.enabled) {
                    var $parent        = $this.parents('.' + $widget.options.classes.attributeClass);
                    var attributeId    = $parent.data('attribute-id');
                    var options        = _.object(_.keys($widget.optionsMap), {});
                    var productOptions = {};

                    $widget.element.find('.' + $widget.options.classes.attributeClass + '[option-selected]').each(function () {
                        var attributeId = $(this).data('attribute-id');
                        options[attributeId] = $(this).attr('option-selected');
                    });

                    $('.mgz-pmt td').removeClass('pmt-focus');
                    var optionClass = '.pmt-option';
                    for (var k in options) {
                        optionClass += '-' + options[k];

                        if (options[k]) {
                            productOptions[k] = options[k];
                        }
                    }

                    if (this.matrixType == 'type1') {
                        $(optionClass).addClass('pmt-focus');
                    }

                    if (this.matrixType == 'type2') {

                        if (attributeId != $widget.lastId) {
                            this._renderLastControl(productOptions);
                        }
                    }
                }
            },

            _Rebuild: function () {
                this._super();
                if (this.enabled) {
                    this.element.find('div[data-option-id], option[data-option-id]').removeClass('disabled').removeAttr('disabled');
                    this.element.find('div[option-empty], option[option-empty]').attr('disabled', true).addClass('disabled');
                }
            },

            _UpdatePrice: function() {
                this._super();

                var $widget = this,
                options = _.object(_.keys($widget.optionsMap), {}),
                product;

                $widget.element.find('.' + $widget.options.classes.attributeClass + '[option-selected]').each(function () {
                    var attributeId = $(this).data('attribute-id');

                    options[attributeId] = $(this).attr('option-selected');
                });

                product = $widget.options.jsonConfig.optionPrices[_.findKey($widget.options.jsonConfig.index, options)];

                if (product) {
                    $(this.options.normalPriceLabelSelector).hide();
                }
            },

            _PmtEventListener: function() {

                var $widget = this;

                this.element.on('click', '.pmt-qty-button.minus', function (e) {
                    var target = $(this).data('id');
                    var step   = $(this).attr('step') ? parseInt($(this).attr('step')) : 1;
                    var val    = $('#' + target).val();
                    val        = parseInt(val) - step;
                    if (val >= 0) {
                        $('#' + target).val(val);
                        $('#' + target).focus();
                    }

                    return false;
                });

                this.element.on('click', '.pmt-qty-button.plus', function (e) {
                    var target = $(this).data('id');
                    var step   = $(this).attr('step') ? parseInt($(this).attr('step')) : 1;
                    var val    = $('#' + target).val();
                    val = parseInt(val) + step;

                    if (val <= $(this).data('max')) {
                        $('#' + target).val(val);
                        $('#' + target).focus();
                    }

                    return false;
                });

                this.element.on('change', '.pmt-qty', function (e) {
                    if (parseInt($(this).val()) > parseInt($(this).attr('max'))) {
                        $(this).val($(this).attr('max'));
                    }
                });

                this.element.on('click', '.pmt-btn-view-full a', function (e) {
                    e.preventDefault();
                    $widget.element.addClass('pmt-view-full');
                });

                this.element.on('click', '.pmt-btn-view-less a', function (e) {
                    e.preventDefault();
                    $widget.element.removeClass('pmt-view-full');
                });

                this.element.on('click', '.pmt-btn-reset a', function (e) {
                    e.preventDefault();
                    $widget.element.find('.pmt-qty').each(function(index, el) {
                        $(this).val($(this).attr('min'));
                    });
                });

                $(window).resize(function() {
                    $('.mgz-pmt').css('max-width', $('.column.main').width())
                }).resize();
            },

            processUpdateBaseImage: function (images, context, isInProductView, gallery) {
                if (gallery) {
                    this._super(images, context, isInProductView, gallery);
                }
            },

            _PmtRenderPrice: function(product) {
                var html = '';

                if (product) {

                    var priceTemplate = mageTemplate(this.options.priceTemplate);
                    var priceFormat = this.options.jsonConfig.priceFormat ? this.options.jsonConfig.priceFormat  : {};
                    var price = {
                        formatted: utils.formatPrice(product.finalPrice.amount, priceFormat),
                        final: product.finalPrice.amount,
                        amount: product.finalPrice.amount
                    };

                    var priceHtml = priceTemplate({
                        data: price
                    });

                    html += '<div class="pmt-price-container">';

                    html += '<div class="pmt-price">' + priceHtml + '</div>';

                    if (product.oldPrice.amount !== product.finalPrice.amount && this.options.displayOldPrice) {
                        html += this._renderOldPriceHtml(product.oldPrice.amount);
                    }

                    html += '</div>';
                }

                return html;
            },

            _renderOldPriceHtml: function(oldPrice) {
                return '<div class="pmt-old-price">' + this._renderPriceHtml(oldPrice) + '</div>';
            },

            _renderPriceHtml: function(price) {
                var priceFormat = this.options.jsonConfig.priceFormat ? this.options.jsonConfig.priceFormat  : {};
                return utils.formatPrice(price, priceFormat);
            },

            _PmtRenderInput: function(product, options, inputName) {

                var html    = '';
                var uid     = 'pmt-qty';
                var tdClass = 'pmt-quantity ';

                if (product && product.isSalable) {
                    tdClass += ' pmt-instock';
                } else {
                    tdClass += ' pmt-outofstock';
                }

                tdClass += ' pmt-option';

                for (var k in options) {
                    var _optionId = options[k];
                    uid       += '-' + _optionId;
                    tdClass   += '-' + _optionId;
                }

                html += '<td ' + (product && product.id ? (' id="pmt-item-' + product.id + '" ') : '') + ' class="' + tdClass + '">';

                    if (product && product.isSalable) {
                        html += '<div class="pmt-qty-wrapper">';
                        html += '<span class="pmt-qty-button minus" step="1" data-id="' + uid + '">-</span>';
                        html += '<input type="number" min="0" max="' + product['qty'] + '" value="0" id="' + uid + '" class="pmt-qty" name="' + inputName + '"/>';
                        html += '<span class="pmt-qty-button plus" step="1" data-max="' + product['qty'] + '" data-id="' + uid + '">+</span>';
                        html += '</div>';
                        html += this._PmtRenderPrice(product);
                        if (this.options.displayAvailableQty) {
                            html += '<div class="pmt-stock-status">' + $t('In Stock') + ' (' + product['qty'] + ')' + '</div>';
                        }
                    } else {
                        html += '<span>' + $t('Out of stock') + '</span>';
                    }

                html += '</td>';

                return html;
            },

            _PmtBtnHtml: function(container) {

                if (this.options.displayResetBtn) {
                    $('.pmt-btn-reset').remove();
                    var resetHtml = '<div class="pmt-btn-reset"><a href="#">' + $t('Reset All') + '</a></div>';
                    $(resetHtml).insertBefore(container);
                }
                    
                if (container.find('table').width() > $(container).parent().width() && this.options.displayViewmoreBtn) {

                    var viewMoreHtml = '<div class="pmt-btn-view-full"><a href="#">' + $t('View more') + '</a></div>';
                    $(viewMoreHtml).insertAfter(container);
                    $(viewMoreHtml).insertBefore(container);

                    var viewLessHtml = '<div class="pmt-btn-view-less"><a href="#">' + $t('View less') + '</a></div>';
                    $(viewLessHtml).insertAfter(container);
                    $(viewLessHtml).insertBefore(container);
                }
                return this;
            },

            isFakeMode: function() {
                const jsConfig = this.options.jsonConfig;
                var total = Object.keys(jsConfig.attributes).length;
                return jsConfig.enableProductMattrix && !!jsConfig.fakeHeadingLabel && !!jsConfig.fakeAttributeLabel && (total === 1 || _.isArray(jsConfig.attributes) && total === 2 && jsConfig.attributes[1]['id'] === 'fake');
            }
        });

        return $.mage.SwatchRenderer;
    }
});