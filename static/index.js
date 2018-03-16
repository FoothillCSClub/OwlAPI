document.addEventListener('DOMContentLoaded', function(){
  whenAvailable('#interact', forms => {
    [].forEach.call(forms, f => {
      var type = f.firstChild.dataset.requestType;
      var url = f.firstChild.dataset.requestUrl;
      var data = f.firstChild.dataset.requestBody;

      var el = document.createElement("div");
      el.innerHTML = generate_data(type, url, data);

      f.replaceChild(el, f.firstChild);
    });

    var numbers = document.querySelectorAll('.token.number');

    numbers.forEach(n => {
      n.classList.add('punctuation');
      n.classList.remove('number');
    });
  });
}, false);

function whenAvailable(name, callback) {
  var interval = 10; // ms
  window.setTimeout(function() {
    var forms = document.querySelectorAll(name);
    if (forms.length) {
        callback(forms);
    } else {
        window.setTimeout(arguments.callee, interval);
    }
  }, interval);
}

function generate_data(type, url, data) {
  var input = (type == 'GET') ? `<input class="input is-medium" id="data" type="text" value="${url + data}">` :
                                `<textarea class="input" id="body">${data}</textarea>`

  return `
          <div class="field has-addons is-hidden-mobile text">
            <p class="control">
              <a class="button is-medium is-static left" id="type">${type}</a>
            </p>
            <script type="form/url" data-url=${url}></script>
            <p class="control is-expanded">
              ${input}
            </p>
            <div class="control" onclick="request_submit(this.parentElement)">
              <a class="button is-medium is-dark has-text-white right faa-parent animated-hover" id="button">
                <span>Send</span>
                <span class="icon is-small has-text-white faa-pulse animated-hover">
                  <i class="fas fa-paper-plane"></i>
                </span>
              </a>
            </div>
            <div class="modal" id="modal">
              <div class="modal-background" onclick="toggleModal(this.parentElement, false)"></div>
              <div class="modal-content"></div>
            </div>
          </div>
         `
}

function request_submit(field) {
  var type = field.querySelector('#type').innerHTML;
  var url = field.querySelector('script[type="form/url"]').dataset.url;
  var data = (type == 'GET') ? field.querySelector('#data').value : field.querySelector('#body').innerHTML; ;

  var modal = field.querySelector('#modal');
  var button = field.querySelector('#button');
  button.classList.add('is-loading');

  if (type == 'GET') {
    if (!data)
      data = " ";
    fetch(data, {
      headers: {
        'Accept': 'application/json, application/xml, text/plain, text/html, *.*'
      },
        method: 'GET',
      })
      .then(response => { updateModal(modal, button, response) })
      .catch(function(err) {
        console.info(err + " url: " + body);
        button.classList.remove('is-loading');
    });
  }
  else if (type = 'POST') {
    fetch(url, {
        headers: {
          'Accept': 'application/json, application/xml, text/plain, text/html, *.*',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: data
      })
      .then(response => { updateModal(modal, button, response) })
      .catch(function(err) {
        console.info(err + " url: " + url);
        button.classList.remove('is-loading');
    });
  }
}

function updateModal(modal, button, response) {
  var res = Promise.resolve(response.json());
  var modalContent = modal.querySelector('.modal-content');

  res.then(json => {
    modalContent.innerHTML = `<pre>${JSON.stringify(json, undefined, 2)}</pre>`;
    toggleModal(modal, true);
    button.classList.remove('is-loading');
  });
}

function toggleModal(modal, state) {
  state ? modal.classList.add('is-active') : modal.classList.remove('is-active');
}

var scrollTimer = null;
$(window).scroll(function () {
    if (scrollTimer) {
        clearTimeout(scrollTimer);   // clear any previous pending timer
    }
    scrollTimer = setTimeout(updateMenu, 5);   // set new timer
});

function updateMenu(){
  scrollTimer = null;
  var scrollDistance = $(window).scrollTop();

  var sections = $('.page-section');
  sections.each(function(i) {
      if ($(this).offset().top + 20 <= scrollDistance) {
          if (i != sections.length - 1)
            $(".menu-item:not('.menu-item-unselectable') a.is-active").removeClass('is-active');
          $(".menu-item:not('.menu-item-unselectable') a").eq(i).not(".button").addClass('is-active');
      }
  });
}