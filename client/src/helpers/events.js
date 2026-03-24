import helpers from './index.js';

export const loadEvents = () => {
    //When the chat icon is clicked
    const toggleChatBtn = document.querySelector( '#toggle-chat-pane' );
    if (toggleChatBtn) {
        toggleChatBtn.addEventListener( 'click', ( e ) => {
            let chatElem = document.querySelector( '#chat-pane' );
            let mainSecElem = document.querySelector( '#main-section' );
            if (!chatElem || !mainSecElem) return;

            if ( !chatElem.hasAttribute( 'hidden' ) ) {
                chatElem.setAttribute( 'hidden', true );
                mainSecElem.classList.remove( 'col-md-9' );
                mainSecElem.classList.add( 'col-md-12' );
                chatElem.classList.remove( 'chat-opened' );
            }

            else {
                chatElem.removeAttribute( 'hidden' );
                mainSecElem.classList.remove( 'col-md-12' );
                mainSecElem.classList.add( 'col-md-9' );
                chatElem.classList.add( 'chat-opened' );
            }

            //remove the 'New' badge on chat icon (if any) once chat is opened.
            setTimeout( () => {
                if ( document.querySelector( '#chat-pane' ) && document.querySelector( '#chat-pane' ).classList.contains( 'chat-opened' ) ) {
                    helpers.toggleChatNotificationBadge();
                }
            }, 300 );
        } );
    }


    //When the video frame is clicked. This will enable picture-in-picture
    const localVideo = document.getElementById( 'local' );
    if (localVideo) {
        localVideo.addEventListener( 'click', () => {
            if ( !document.pictureInPictureElement ) {
                localVideo.requestPictureInPicture()
                    .catch( error => {
                        // Video failed to enter Picture-in-Picture mode.
                        console.error( error );
                    } );
            }

            else {
                document.exitPictureInPicture()
                    .catch( error => {
                        // Video failed to leave Picture-in-Picture mode.
                        console.error( error );
                    } );
            }
        } );
    }

    document.addEventListener( 'click', ( e ) => {
        if ( e.target && e.target.classList.contains( 'expand-remote-video' ) ) {
            helpers.maximiseStream( e );
        }

        else if ( e.target && e.target.classList.contains( 'mute-remote-mic' ) ) {
            helpers.singleStreamToggleMute( e );
        }
    } );

    const closeModalBtn = document.getElementById( 'closeModal' );
    if (closeModalBtn) {
        closeModalBtn.addEventListener( 'click', () => {
            helpers.toggleModal( 'recording-options-modal', false );
        } );
    }
}
