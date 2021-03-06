import React, { Component } from 'react';
import './style/AdminPage.css';
import { toWords } from 'number-to-words';
import { words as capitalize } from 'capitalize';
import Clipboard from 'react-clipboard.js';
import { genSaltSync, hashSync, compareSync } from 'bcryptjs';
import horizontalLine from './assets/images/horizontal-line.png';

class AdminPage extends Component {
  constructor() {
    super();

    this.state = {
      confessions: [],
      page: 1,
      access: false,
      secretaccess: false,
      flipOrder: false,
      hidePosted: true,
      savedID: null,
      savedIndex: null,
    };
  };

  async componentDidMount() {

    this.hash = localStorage.getItem('access');
    this.secrethash = localStorage.getItem('secretaccess');
    this.match = false;
    this.secret = false;

    if(!this.hash && this.secrethash) return;

    const res = await fetch(`/auth/team?user=${this.secrethash ? 'admin' : 'team'}&password=${this.secrethash || this.hash}`);
    const { auth: hasAccess } = await res.json();

    if(hasAccess) {
      this.setState({ access: true, secretaccess: !!this.secrethash });

      this.secret = !!this.secrethash;
    } else {
      localStorage.removeItem('access');
      localStorage.removeItem('secretaccess');

      this.hash = null;
      this.secrethash = null;
    }

    if(hasAccess) {
      fetch(`/api/confessions?key=${this.hash}`)
        .then(res => res.json())
        .then(confessions => {
          if(!confessions.error) {
            confessions.forEach((confession, index) => {
              confession.index = index;
            });

            this.setState({ confessions });
          }
        });
    }

    document.addEventListener('scroll', this.trackScrolling);
  };

  componentWillUnmount() {
    document.removeEventListener('scroll', this.trackScrolling);
  }

  handleDelete = event => {
    let _id, index;
    const confessions = [...this.state.confessions].filter(confession => {
      if(confession._id == event.target.value) {
        _id = confession._id;
        index = confession.index;
      }

      return confession._id !== event.target.value;
    });

    this.setState({ deleteModal: true, savedID: _id, savedIndex: index });
  };

  handleAccess = async (event) => {
    if(event.keyCode !== 13) return;
    const accessInput = document.querySelector('.access-input');
    const rememberBox = accessInput.nextSibling.childNodes[0];

    const isChecked = rememberBox.checked;

    const salt = genSaltSync(10);
    const hash = hashSync(accessInput.value, salt);

    const res = await fetch(`/auth/teamInitial?password=${accessInput.value}`);
    const { auth, user } = await res.json();

    if(auth) {
      this.setState({ access: true, secretaccess: user === 'admin' });
      this.secret = user === 'admin';
      if(isChecked) {
        if(user === 'admin') {

          localStorage.setItem('secretaccess', hash);
        }

        localStorage.setItem('access', hash);
      }


      fetch(`/api/confessions?key=${hash}`)
        .then(res => res.json())
        .then(confessions => {
          if(!confessions.error) {
            confessions.forEach((confession, index) => {
              confession.index = index;
            });

            this.setState({ confessions });
          }
        });

    }
  };

  renderPasswordInput = () => {
    return (
      <div className="confession">
        <h1>RESTRICTED ACCESS: TEAM MEMBERS ONLY</h1>
        <h1>ENTER PASSWORD</h1>
        <input onKeyDown={this.handleAccess} type="password" className="access-input" />
        <div onKeyDown={this.handleAccess} className="remember-row"><input type="checkbox" id="remember" name="remember" /> Remember Me</div>
      </div>
    )
  };
  togglePosted = event => {
    this.setState({ hidePosted: event.target.textContent === 'Hidden' });
  };
  handlePosted = confession => {
    let action = 'hide';

    if(confession.isHidden) {
      action = 'show';
    }

    confession.isHidden = !confession.isHidden;

    this.setState({ confessions: this.state.confessions });

    fetch('/confessions', {
      method: 'PUT',
      body: JSON.stringify({ _id: confession._id, action }),
      headers:{
        'Content-Type': 'application/json'
      },
    });
  };

  handleRevealClick = (event, _id)=> {
    let item = null;
    const secretaccess = localStorage.getItem('secretaccess');

    if(event.target.className === 'reveal-link reveal-email') {
      item = 'email';
    } else {
      item = 'facebookURL';
    }

    fetch(`/contact?item=${item}&secretaccess=${secretaccess}&confessionId=${_id}`, {
      mode: 'cors',
      headers:{
        'Content-Type': 'application/json'
      },
    })
      .then(res => res.json())
      .then(resItem => {
        const { confessions } = this.state;

        for(let confession of confessions) {
          if(confession._id === _id) {
            if((!confession.email || confession.email === '') && item === 'email') {
              confession.email = resItem.email || 'No email found';
            }

            if((!confession.facebookURL || confession.facebookURL === '') && item === 'facebookURL') {
              confession.facebookURL = resItem.facebookURL || 'No URL found';
            }

          }
        }

        this.setState({ confessions });
      });
  };
  renderConfessions = () => {
    const { confessions, flipOrder, secretaccess } = this.state;

    if(!confessions || !confessions.length) {
      return [
        <h1>No confessions loaded</h1>
      ];
    }

    const mappedConfessions = confessions.map(confession => {
      const entry = capitalize(toWords((confession.index || 0) + 159));
      const submission = `#SubtleAsianConfession ${entry}\nTW/CW: ${confession.allTW}\nSeeking: ${confession.intent}\nLink to form: https://bit.ly/samhs-confessions\n.\n.\n.\n.\n.\n.\n.\n.\n${confession.submission}`;

      if(confession.isHidden && this.state.hidePosted) {
        return null;
      }

      return (<div className="confession" key={confession._id}>
        <h4 className="questions body-copy">Entry:<br /><span className="body-copy">{entry}</span></h4>
        <h4 className="questions body-copy">Marked as Posted?:<br />{confession.isHidden ? 'Yes' : 'No'}</h4>
        <h4 className="questions body-copy">Commenting Allowed?<br />{confession.allowComments ? 'Yes' : 'No'}</h4>
        <h4 className="questions body-copy">Read Trigger Warning?<br />{confession.readTW ? 'Yes' : 'No'}</h4>
        {this.secret && secretaccess && confession.hasEmail && <h4 className="questions body-copy">Email:<br />{confession.email || <span onClick={event => this.handleRevealClick(event, confession._id)} className="reveal-link reveal-email">[Click to reveal]</span>}</h4>}
        {this.secret && secretaccess && confession.hasFacebookURL && <h4 className="questions body-copy">Facebook URL:<br />{confession.facebookURL || <span onClick={event => this.handleRevealClick(event, confession._id)} className="reveal-link reveal-facebookURL">[Click to reveal]</span>}</h4>}
        <h4 className="questions body-copy">Submission:</h4>
        <textarea
          id={confession._id}
          className="form-control"
          rows="15"
          value={submission}
          readOnly
        />
        <div className="button-row">
          <Clipboard className="btn btn-inactive" data-clipboard-text={submission}>
            Copy to Clipboard
          </Clipboard>
          <button onClick={() => this.handlePosted(confession)} className="btn btn-inactive">
            {confession.isHidden ? 'Unmark' : 'Mark'} As Posted
          </button>
          <button value={confession._id} onClick={this.handleDelete} className="btn btn-inactive">
            Delete
          </button>
        </div>
      </div>);
    }).filter(node => !!node);

    return flipOrder ? mappedConfessions : mappedConfessions.reverse();
  };

  isBottom = (el) => {
    return Math.floor(el.getBoundingClientRect().bottom) <= window.innerHeight;
  };

  trackScrolling = () => {
    const wrappedElement = document.querySelector('.entry-container');

    if (this.isBottom(wrappedElement)) {
      this.setState({ page: this.state.page + 1 });
    }
  };

  handleFlipOrder = event => {
    this.setState({ flipOrder: event.target.textContent === 'Chronological' });
  };

  handleDeleteModalClick = event => {
    switch(event.target.className) {
      case 'delete-modal-container':
      case 'btn btn-warning':
        this.setState({ deleteModal: false, savedID: null, savedIndex: null });
        break;
      case 'btn btn-danger':
        this.handleDeleteClickOnModal();
        break;
      default:
        break;
    };
  };

  onDeleteModalKeyDown = event => {
    const { keyCode } = event;
    if(keyCode !== 13) return null;

    this.handleDeleteClickOnModal();
  };

  handleDeleteClickOnModal = () => {
    const hash = localStorage.getItem('access');
    let _id;

    if(!compareSync(this.refs.deleteModalInput.value, hash)) return;


    const confessions = [...this.state.confessions].filter(confession => {
      if(confession._id == this.state.savedID) {
        _id = confession._id;
      }

      return confession._id !== this.state.savedID;
    });

    confessions.forEach((confession, index) => {
      confession.index = index;
    });

    this.setState({ confessions, deleteModal: false, savedID: null, savedIndex: null }, () => {
      fetch('/confessions', {
        method: 'DELETE',
        body: JSON.stringify({ _id }),
        headers: {
          'Content-Type': 'application/json'
        },
      });
    });
  };

  renderDeleteModal = () => {
    return (
      <div onClick={this.handleDeleteModalClick} className="delete-modal-container">
        <div className="delete-modal">
          <h1>CAUTION: You are deleting a confession</h1>
          <h2>Entry: {capitalize(toWords(this.state.savedIndex + 159))}</h2>
          <h2>Please Enter password to confirm delete</h2>
          <input type="password" ref="deleteModalInput" onKeyDown={this.onDeleteModalKeyDown} className="delete-input"/>
          <div className="button-row">
            <button className="btn btn-warning">Back</button>
            <button className="btn btn-danger">Confirm</button>
          </div>
        </div>
      </div>
    );
  };
  render() {

    const {
      deleteModal,
      access,
      secretaccess,
      page,
      flipOrder,
      hidePosted,
    } = this.state;

    return (
      <div>
        {deleteModal && this.renderDeleteModal()}
        <div className="admin-page">
          <div className="placeholder-box"/>
          <div className="entry-container">
            <div className="entry-container-inner">
              {access && (
                <div>
                  <h1 className="page-heading">Sad Asian Confessions</h1>
                  <h2 className="other">{secretaccess ? 'Admin' : 'Team'} Confessions View</h2>
                  <h3 className="section-heading">Sort Confessions Status</h3>
                  <div className="confession-switches">
                    <div className="switch">
                      <h4 className="question4">Order Viewed</h4>
                      <div onClick={this.handleFlipOrder} className="btn-group button-switch">
                        <button className={`btn button-switch-first ${!flipOrder ? 'btn-default' : 'btn-inactive'}`}>Reverse Chronological</button>
                        <button className={`btn button-switch-second ${flipOrder ? 'btn-default' : 'btn-inactive'}`}>Chronological</button>
                      </div>
                      <h4 className="question4">Approved Posts</h4>
                      <div onClick={this.togglePosted} className="btn-group button-switch">
                        <button className={`btn button-switch-first ${hidePosted ? 'btn-default' : 'btn-inactive'}`}>Hidden</button>
                        <button className={`btn button-switch-second ${!hidePosted ? 'btn-default' : 'btn-inactive'}`}>Posted</button>
                      </div>
                    </div>
                  </div>
                  <h3 className="section-heading">Confessions Status</h3>
                </div>
              )}
              {access && this.renderConfessions().slice(0, 10 * page)}
              {!access && this.renderPasswordInput()}
            </div>
          </div>
          <div className="placeholder-box"/>
        </div>
      </div>
    );
  }
}

export default AdminPage;
