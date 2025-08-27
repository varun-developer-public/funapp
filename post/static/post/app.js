document.addEventListener('DOMContentLoaded', () => {
    // 🔹 CSRF token helper
    function getCSRFToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='));
        return cookieValue ? cookieValue.split('=')[1] : '';
    }
    const csrftoken = getCSRFToken();

    // 🔹 Delete post functionality
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            if (!confirm('Are you sure you want to delete this post?')) {
                return;
            }
            
            const postId = e.currentTarget.dataset.postId;
            
            if (!postId) {
                console.error("❌ Delete button missing postId");
                return;
            }
            
            try {
                const response = await fetch(`/delete/${postId}/`, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': csrftoken
                    }
                });
                
                const data = await response.json();
                if (data.success) {
                    // Remove the post from the DOM
                    const postElement = document.querySelector(`.post-card[data-post-id="${postId}"]`);
                    if (postElement) {
                        postElement.remove();
                    }
                } else {
                    console.error("❌ Delete post error:", data.error);
                    alert(data.error || 'Failed to delete post');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while deleting the post');
            }
        });
    });

    // 🔹 Like post functionality
    document.querySelectorAll('.like-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const postId = e.currentTarget.dataset.postId;

            if (!postId) {
                console.error("❌ Like button missing postId");
                return;
            }

            try {
                const response = await fetch(`/like/${postId}/`, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': csrftoken
                    }
                });
                const data = await response.json();
                
                if (data.error === 'login required') {
                    window.location.href = '/login/';
                    return;
                }
                
                // update like count
                e.currentTarget.querySelector('.like-count').textContent = data.likes_count;
                
                // toggle like highlight
                if (data.liked) {
                    e.currentTarget.classList.add('liked');
                } else {
                    e.currentTarget.classList.remove('liked');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    });

    // 🔹 Comment submission
    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // ✅ safest way: always pull from form attribute
            const postId = e.currentTarget.getAttribute("data-post-id");

            if (!postId) {
                console.error("❌ Comment form missing postId");
                return;
            }

            console.log("📨 Submitting comment for post:", postId);

            const formData = new FormData(form);

            try {
                const response = await fetch(`/comment/${postId}/`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': csrftoken
                    }
                });
                
                const data = await response.json();
                if (data.success) {
                    const commentsSection = document.getElementById(`comments-${postId}`);
                    const newComment = document.createElement('div');
                    newComment.className = 'comment';
                    newComment.innerHTML = `
                        <strong>${data.username}</strong>
                        <span>${data.comment}</span>
                        <small>${data.timestamp}</small>
                    `;
                    commentsSection.insertBefore(newComment, form);
                    form.reset();

                    // scroll to new comment smoothly
                    newComment.scrollIntoView({ behavior: "smooth", block: "center" });
                } else {
                    console.error("❌ Comment API error:", data);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    });
});
