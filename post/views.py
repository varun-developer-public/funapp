from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib.auth.forms import AuthenticationForm
from .models import Post, Comment
from .forms import PostForm, CommentForm


# 🔹 Home Feed
def home_feed(request):
    posts = Post.objects.all().order_by('-created_at')
    return render(request, 'post/home.html', {'posts': posts})


# 🔹 Create Post
@login_required
def create_post(request):
    if request.method == "POST":
        form = PostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            
            # Handle case when no photo is uploaded
            if 'photo' not in request.FILES:
                post.photo = None
                
            post.save()
            return redirect("home_feed")
    else:
        form = PostForm()
    return render(request, "post/create_post.html", {"form": form})


# 🔹 Like Post
def like_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'login required'})

    # Check if it's a POST request
    if request.method != 'POST':
        return JsonResponse({'error': 'POST request required'}, status=400)

    if request.user in post.likes.all():
        post.likes.remove(request.user)
        liked = False
    else:
        post.likes.add(request.user)
        liked = True

    return JsonResponse({
        'likes_count': post.likes.count(),
        'liked': liked
    })


# 🔹 Add Comment
def add_comment(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    if request.method == 'POST':
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            if request.user.is_authenticated:
                comment.user = request.user
                username = request.user.username
            else:
                comment.user = None
                username = "Anonymous"
            comment.post = post
            comment.save()
            return JsonResponse({
                'success': True,
                'comment': comment.text,
                'username': username,
                'timestamp': comment.created_at.strftime("%b %d, %Y %I:%M %p")
            })
    return JsonResponse({'success': False})


# 🔹 Login View
def user_login(request):
    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get("username")
            password = form.cleaned_data.get("password")
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect("home_feed")
    else:
        form = AuthenticationForm()
    return render(request, "post/login.html", {"form": form})


# 🔹 Delete Post
@login_required
def delete_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    
    # Check if the user is the author of the post
    if request.user != post.author:
        return JsonResponse({'error': 'You are not authorized to delete this post'}, status=403)
    
    if request.method == 'POST':
        post.delete()
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True})
        return redirect('home_feed')
    
    return JsonResponse({'error': 'POST request required'}, status=400)


# 🔹 Logout View
def user_logout(request):
    logout(request)
    return redirect("login")
