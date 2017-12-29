$(document).ready(function () {
    var owlitem = $(".item-carousel");
    owlitem.owlCarousel({ navigation: false, pagination: true, items: 5, itemsDesktopSmall: [979, 3], itemsTablet: [768, 3], itemsTabletSmall: [660, 2], itemsMobile: [400, 1] });
    $("#nextItem").click(function () { owlitem.trigger('owl.next'); })
    $("#prevItem").click(function () { owlitem.trigger('owl.prev'); })
    var featuredListSlider = $(".featured-list-slider");
    featuredListSlider.owlCarousel({ navigation: false, pagination: false, items: 5, itemsDesktopSmall: [979, 3], itemsTablet: [768, 3], itemsTabletSmall: [660, 2], itemsMobile: [400, 1] });

    $(".featured-list-row .next").click(function () { featuredListSlider.trigger('owl.next'); })
    $(".featured-list-row .prev").click(function () { featuredListSlider.trigger('owl.prev'); })
    $("#ajaxTabs li > a").click(function () {
         $("#allAds").empty().append("<div id='loading text-center'> <br> <img class='center-block' src='images/loading.gif' alt='Loading' /> <br> </div>");
         $("#ajaxTabs li").removeClass('active');
         $(this).parent('li').addClass('active');
         $.ajax({ url: this.href, success: function (html) { $("#allAds").empty().append(html); $('.tooltipHere').tooltip('hide'); } });
         return false; 
    });
    urls = $('#ajaxTabs li:first-child a').attr("href");
    $("#allAds").empty().append("<div id='loading text-center'> <br> <img class='center-block' src='images/loading.gif' alt='Loading' /> <br>  </div>");

    /* $.ajax({ url: urls, success: function (html) {
        $("#allAds").empty().append(html);
        $('.tooltipHere').tooltip('hide');
        $(function () {
            $('.hasGridView .item-list').addClass('make-grid');
            $('.hasGridView .item-list').matchHeight();
            $.fn.matchHeight._apply('.hasGridView .item-list'); 
        });
    }}); */
    
    $('.list-view,#ajaxTabs li a').click(function (e) {
        e.preventDefault();
        $('.grid-view,.compact-view').removeClass("active");
        $('.list-view').addClass("active");
        $('.item-list').addClass("make-list").removeClass("make-grid make-compact");
        if($('.adds-wrapper').hasClass('property-list')) {
            $('.item-list .add-desc-box').removeClass("col-sm-9").addClass("col-sm-6"); 
        } else {
            $('.item-list .add-desc-box').removeClass("col-sm-9").addClass("col-sm-7");
        }
        $(function () { $('.item-list').matchHeight('remove'); });
    });

    $('.grid-view').click(function (e) {
        e.preventDefault();
        $('.list-view,.compact-view').removeClass("active");
        $(this).addClass("active");
        $('.item-list').addClass("make-grid").removeClass("make-list make-compact");
        
        /* ?
        if($('.adds-wrapper').hasClass('property-list')) {

        } else {

        } */
        
        $(function () { $('.item-list').matchHeight(); $.fn.matchHeight._apply('.item-list'); });
    });

    $(function () {
        $('.hasGridView .item-list').matchHeight();
        $.fn.matchHeight._apply('.hasGridView .item-list'); 
    });
    $(function () {
        $('.row-featured .f-category').matchHeight();
        $.fn.matchHeight._apply('.row-featured .f-category');
    });
    $(function() {
        $('.has-equal-div > div').matchHeight();
        $.fn.matchHeight._apply('.row-featured .f-category');
    });
    $('.compact-view').click(function (e) {
        e.preventDefault();
        $('.list-view,.grid-view').removeClass("active");
        $(this).addClass("active");
        $('.item-list').addClass("make-compact").removeClass("make-list make-grid");
        if($('.adds-wrapper').hasClass('property-list')) {
            $('.item-list .add-desc-box').addClass("col-sm-9").removeClass('col-sm-6');
        } else {
            $('.item-list .add-desc-box').toggleClass("col-sm-9 col-sm-7");
        }
        $(function () { $('.adds-wrapper .item-list').matchHeight('remove'); });
    });

    $('.long-list').hideMaxListItems({ 'max': 8, 'speed': 500, 'moreText': 'View More ([COUNT])' }); $('.long-list-user').hideMaxListItems({ 'max': 12, 'speed': 500, 'moreText': 'View More ([COUNT])' });
    $(function () { $('[data-toggle="tooltip"]').tooltip() });
    $(".scrollbar").scroller();
    $("select.selecter").selecter({ label: "Select An Item" });
    $(".selectpicker").selecter({ customClass: "select-short-by" });
    $(document).on('click', 'a.scrollto', function (event) {
        event.preventDefault();
        $('html, body').animate({ scrollTop: $($.attr(this, 'href')).offset().top }, 500);
    });

    $(window).bind('resize load', function () {
         if ($(this).width() < 767) {
             $('.cat-collapse').collapse('hide'); $('.cat-collapse').on('shown.bs.collapse', function () { $(this).prev('.cat-title').find('.icon-down-open-big').addClass("active-panel"); }); $('.cat-collapse').on('hidden.bs.collapse', function () {
                 $(this).prev('.cat-title').find('.icon-down-open-big').removeClass("active-panel");
            });
            } else {
                $('.cat-collapse').removeClass('out').addClass('in').css('height', 'auto');
            }
    });
    $(".tbtn").click(function () { $('.themeControll').toggleClass('active') });
    $("input:radio").click(function () {
        if ($('input:radio#job-seeker:checked').length > 0) {
            $('.forJobSeeker').removeClass('hide'); $('.forJobFinder').addClass('hide');
        } else {
            $('.forJobFinder').removeClass('hide'); $('.forJobSeeker').addClass('hide')
        }
    });
    $(".filter-toggle").click(function () {
        $('.mobile-filter-sidebar').prepend("<div class='closeFilter'>X</div>");
        $(".mobile-filter-sidebar").animate({ "left": "0" }, 250, "linear", function () { });
        $('.menu-overly-mask').addClass('is-visible');
    })
    $(".menu-overly-mask").click(function () {
        $(".mobile-filter-sidebar").animate({ "left": "-251px" }, 250, "linear", function () { });
        $('.menu-overly-mask').removeClass('is-visible');
    });
    $(document).on('click', '.closeFilter', function () {
        $(".mobile-filter-sidebar").animate({ "left": "-251px" }, 250, "linear", function () { }); $('.menu-overly-mask').removeClass('is-visible');
    });
    $('#selectRegion').on('shown.bs.modal', function (e) {
        $("ul.list-link li a").click(function () {
            $('ul.list-link li a').removeClass('active');
            $(this).addClass('active');
            $(".cityName").text($(this).text());
            $('#selectRegion').modal('hide');
        });
    });
    $("#checkAll").click(function () {
        $('.add-img-selector input:checkbox').not(this).prop('checked', this.checked);
    });
});
$(document).ready(function () {
    $.extend($.expr[":"], {
        "containsNC": function (elem, i, match, array) {
            return (elem.textContent || elem.innerText || "").toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
        }
    });
});
function alertSuccess(msg) {
    alertPopover(msg, 'success');
}

function alertError(msg) {
    alertPopover(msg, 'danger');
}

function alertPopover(msg, style, params) {
    if (!msg) return;
    var id = "alert_" + Math.floor((Math.random() * 100) + 1).toString();

    if (!params) params = {}
    var closeDelay = parseInt(params.closeDelay) || 10000;

    var div = $("<div></div>").addClass("alert alert-" + style + " alert-dismissable fade in show");
    var a = $('<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>');
    $(div).attr("id", id);
    $(div).append(a);
    $(div).append($("<span>" + msg + "</span>"));
    $("#alert").after(div);
    $("#" + id).alert();
    if (closeDelay && closeDelay > -1) {
        setTimeout(function () {
            $("#" + id).alert('close');
        }, closeDelay);
    }
} // alertPopover

// var baseURL = 'http://localhost:3000/';
var baseURL = '/';


// implementação de btn-dropdown que seleciona valor
$('.btn-dropdown-change > ul.dropdown-menu').on('click', function (e) {
    e.preventDefault();
    var $target = $(e.target);
    var value = $target.data('value');
    // console.log('target',$target,'value',value);
    var $root = $target.parentsUntil('.btn-dropdown-change').parent();
    var id = $root.attr('id');
    $(this).trigger('change-dropdown', { id: id, value: value });
});

$('body').on('change-dropdown', function (evt, data) {
    var id = data.id;
    var value = data.value;
    if (!data || !data.id) {
        return false;
    }
    var $root = $('#' + id);
    var $btnUnitText = $('#' + id + ' > button > span:first-child');
    var $item = $root.find('[data-value="' + value + '"]');
    var text = $item.text();
    $btnUnitText.text(text);
    $root.data('value', value);
    console.log('$root.data.value', $root.data('value'));
    // $btnUnitText.text(unitText);
});

// mostra/oculta forms e carrega infs necessárias;
function changeForm(params) {
    if(!params) params={}
    var id=params.id || '';
    var th=params.th || null;

    // link do menu
    $('#left-menu li').removeClass('selected');
    $(th).parent().addClass('selected');

    $('.telas').hide();
    $('#'+id).show();

    // carregando infs
    if(id == 'confs-chatbot') {
        f_getChatConfs({name:'all'});
    }

} // changeForm

// centralização das chamadas ajax;
function ajaxCall(params) {
    if(!params) {
        return false;
    }
    var url=params.url;
    var data=params.data || null;
    var method=params.method || 'POST';
    var dataType=params.dataType || 'json';
    var extraConfs=params.extraConfs || {};
    var errorHandler=params.errorHandler || function(error) {
        if(error) {
            var error=error.responseJSON;
            var msgError=error.error;
            if(typeof msgError == 'object') {
                msgError=msgError.error;
            }
            alertPopover(msgError, 'danger',{closeDelay:-1});
        }
    }
    
    // algo a ser executado tanto no "always"
    var always=params.always || function() {};


    var confs={
        url:url,
        data:data,
        method:method,
        dataType:dataType
    }
    confs=Object.assign(confs,extraConfs);
    return new Promise((res,rej)=>{
        return $.ajax(confs)
        .done(function(data) {
            return res({data:data});
        })
        .fail(function(error) {
            errorHandler(error);
            return rej({error:error});
        })
        .always(always);
    });
} // ajaxCall