import React, { Component } from 'react';
import './style/AdminPage.css';
import { toWords } from 'number-to-words';
import { words as capitalize } from 'capitalize';
import Clipboard from 'react-clipboard.js';
import { genSaltSync, hashSync, compareSync } from 'bcryptjs';
import adminpass from './adminpass';
import horizontalLine from './assets/images/horizontal-line.png';

class AdminPage extends Component {
  constructor() {
    super();
    this.hash = localStorage.getItem('access');
    this.match = false;

    if(this.hash) {
      this.match = compareSync(adminpass, this.hash);

      if(!this.match) {
        localStorage.removeItem('access');
      }
    }




    this.state = {
      confessions: [],
      page: 1,
      access: this.match,
      flipOrder: false,
      hidePosted: true,
      savedID: null,
      savedIndex: null,
    };
  };

  componentDidMount() {
    if(this.match) {
      fetch('/api/confessions')
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
    // this.setState({ confessions }, () => {
    //   // fetch('/confessions', {
    //   //   method: 'DELETE',
    //   //   body: JSON.stringify({ _id }),
    //   //   headers: {
    //   //     'Content-Type': 'application/json'
    //   //   },
    //   // });
    // });
  };

  handleAccess = event => {
    if(event.keyCode !== 13) return;
    const accessInput = document.querySelector('.access-input');
    const rememberBox = accessInput.nextSibling.childNodes[0];

    const isChecked = rememberBox.checked;

    if(accessInput.value === adminpass) {
      this.setState({ access: true }, () => {
        if(isChecked) {
          const salt = genSaltSync(10);
          const hash = hashSync(adminpass, salt);

          localStorage.setItem('access', hash);
        }


        fetch('/api/confessions')
          .then(res => res.json())
          .then(confessions => {
            if(!confessions.error) {
              confessions.forEach((confession, index) => {
                confession.index = index;
              });

              this.setState({ confessions });
            }
          });
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
  togglePosted = () => {
    this.setState({ hidePosted: !this.state.hidePosted });
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

  renderConfessions = () => {
    const { confessions, flipOrder } = this.state;

    if(!confessions || !confessions.length) {
      return [
        <h1>No confessions loaded</h1>
      ];
    }

    const mappedConfessions = confessions.map(confession => {
      const entry = capitalize(toWords((confession.index || 0) + 159));
      const submission = `#SubtleAsianConfession ${entry}\nTW/CW: ${confession.allTW}\nSeeking: ${confession.intent}\n.\n.\n.\n.\n.\n.\n.\n.\n${confession.submission}`;

      if(confession.isHidden && this.state.hidePosted) {
        return null;
      }

      return (<div className="confession" key={confession._id}>
        <h2>Entry: {entry}</h2>
        <h2>Marked as Posted?: {confession.isHidden ? 'Yes' : 'No'}</h2>
        <h2>Commenting Allowed? {confession.allowComments ? 'Yes' : 'No'}</h2>
        <h2>Read Trigger Warning? {confession.readTW ? 'Yes' : 'No'}</h2>
        <h2>Submission:</h2>
        <textarea
          id={confession._id}
          rows="25"
          value={submission}
          readOnly
        />
        <div className="button-row">
          <Clipboard className="btn btn-success" data-clipboard-text={submission}>
            Copy to Clipboard
          </Clipboard>
          <button onClick={() => this.handlePosted(confession)} className="btn btn-warning">
            {confession.isHidden ? 'Unmark' : 'Mark'} As Posted
          </button>
          <button value={confession._id} onClick={this.handleDelete} className="btn btn-danger">
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

  handleFlipOrder = () => {
    this.setState({ flipOrder: !this.state.flipOrder });
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
            {access && (
              <div className = "title-container text-center">
                  <h1>Admin Confessions View</h1>
                  <img className={`img-responsive`} src = {horizontalLine} alt={`horizontal title underline`}/>
              </div>
            )}
            {access && (
              <div>
                <h2 className="upper-h2 upper-h2-header">Confessions Status</h2>
                <h2 className="upper-h2 upper-h2-content">
                  Order Viewed: {flipOrder ? 'Chronological' : 'Reverse Chronological'}
                  <br />
                  Approved Posts: {hidePosted ? 'Hidden' : 'Visible'}
                </h2>
                <div className="button-row">
                  <button onClick={this.handleFlipOrder} className="btn btn-success">Reverse Order</button>
                  <button onClick={this.togglePosted} className="btn btn-warning">{hidePosted ? 'Show Posted' : 'Hide Posted'}</button>
                </div>
              </div>
            )}
            {access && this.renderConfessions().slice(0, 10 * page)}
            {!access && this.renderPasswordInput()}
          </div>
          <div className="placeholder-box"/>
        </div>
      </div>
    );
  }
}

export default AdminPage;
