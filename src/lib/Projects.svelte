<script>
	let { projects } = $props();
</script>

{#if projects?.length}
	<section>
		<h2>Projects</h2>
		<ul>
			{#each projects as { name, url, description }}
				<li>
					<a href={url} target="_blank" rel="noopener noreferrer">
						<strong>{name}</strong>
					</a>
					— {description}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	section {
		margin: 1rem 0;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	ul {
		list-style: none;
		padding: 0;
	}

	li {
		margin-bottom: 0.5rem;
	}

	a {
		color: inherit;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}

	strong {
		font-weight: 600;
	}
</style> 